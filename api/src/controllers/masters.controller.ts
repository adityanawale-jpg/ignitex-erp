import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError, sendValidationError } from '../utils/response';
import { prisma } from '../database/prisma';
import { logger } from '../utils/logger';

const DESIGNS_DIR = () => path.join(__dirname, '../../uploads/designs');

/**
 * PUT /api/v1/masters/design/:id/photo
 * Upload / replace design photo for a design_master record.
 * Accepts a base64 data-URI in req.body.photo (same pattern as profile photo upload).
 */
export const uploadDesignPhoto = async (req: AuthRequest, res: Response): Promise<void> => {
  const uploadsDir = path.join(__dirname, '../../uploads/designs');
  try {
    const designId = parseInt(req.params.id, 10);
    if (!designId || isNaN(designId)) {
      sendValidationError(res, 'Valid design id is required');
      return;
    }

    const { photo } = req.body as { photo?: string };
    if (!photo) {
      sendValidationError(res, 'photo field is required');
      return;
    }

    const match = photo.match(/^data:(image\/(jpeg|jpg|png|gif|webp));base64,(.+)$/i);
    if (!match) {
      sendValidationError(res, 'Invalid image format. Supported: JPEG, PNG, GIF, WebP');
      return;
    }

    const ext = match[2].toLowerCase() === 'jpeg' ? 'jpg' : match[2].toLowerCase();
    const b64 = match[3];

    if (b64.length > 7_000_000) {
      sendValidationError(res, 'Image must be under 5 MB');
      return;
    }

    logger.info(`[design-photo] designId=${designId} size=${b64.length}`);

    try {
      await fs.promises.mkdir(uploadsDir, { recursive: true });
    } catch (mkdirErr) {
      logger.error(`[design-photo] Cannot create directory: ${uploadsDir}`, mkdirErr);
      sendError(res, `Upload directory error: ${(mkdirErr as NodeJS.ErrnoException).message}`);
      return;
    }

    const filename = `design_${designId}.${ext}`;
    const filePath = path.join(uploadsDir, filename);
    try {
      await fs.promises.writeFile(filePath, Buffer.from(b64, 'base64'));
    } catch (writeErr) {
      logger.error(`[design-photo] Cannot write file: ${filePath}`, writeErr);
      sendError(res, `File write error: ${(writeErr as NodeJS.ErrnoException).message}`);
      return;
    }

    const photoUrl = `/uploads/designs/${filename}?v=${Date.now()}`;

    await prisma.design_master.update({
      where: { id: designId },
      data: { design_image: photoUrl, updated_at: new Date() },
    });

    logger.info(`[design-photo] Saved: ${filePath} → ${photoUrl}`);
    sendSuccess(res, { photo_url: photoUrl }, 'Design photo updated');
  } catch (error) {
    logger.error(`[design-photo] Unexpected error`, error);
    sendError(res, `Failed to upload design photo: ${(error as Error).message}`);
  }
};

/**
 * GET /api/v1/masters/design/:id/photos
 * Returns all active images for a design.
 */
export const getDesignPhotos = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const designId = parseInt(req.params.id, 10);
    if (!designId || isNaN(designId)) { sendValidationError(res, 'Valid design id is required'); return; }
    const rows = await prisma.design_images.findMany({
      where: { design_id: designId, is_active: true },
      select: { id: true, image_name: true, image_url: true, is_default: true, sort_order: true },
      orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
    });
    sendSuccess(res, rows);
  } catch (error) {
    sendError(res, `Failed to load design photos: ${(error as Error).message}`);
  }
};

/**
 * POST /api/v1/masters/design/:id/photos
 * Upload one additional photo. Named {design_code}_{N}.{ext}.
 * If it's the first image it becomes the default automatically.
 */
export const addDesignPhoto = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const designId = parseInt(req.params.id, 10);
    if (!designId || isNaN(designId)) { sendValidationError(res, 'Valid design id is required'); return; }

    const { photo } = req.body as { photo?: string };
    if (!photo) { sendValidationError(res, 'photo field is required'); return; }

    const match = photo.match(/^data:(image\/(jpeg|jpg|png|gif|webp));base64,(.+)$/i);
    if (!match) { sendValidationError(res, 'Invalid image format'); return; }
    if (match[3].length > 7_000_000) { sendValidationError(res, 'Image must be under 5 MB'); return; }

    const ext = match[2].toLowerCase() === 'jpeg' ? 'jpg' : match[2].toLowerCase();
    const b64 = match[3];

    // Fetch design_code for naming
    const design = await prisma.design_master.findUnique({ where: { id: designId }, select: { design_code: true } });
    if (!design) { sendValidationError(res, 'Design not found'); return; }
    const designCode = design.design_code.replace(/[^a-zA-Z0-9-]/g, '_');

    // Count existing images to determine next sequence number
    const existingCount = await prisma.design_images.count({ where: { design_id: designId, is_active: true } });
    const nextN = existingCount + 1;

    const imageName = `${designCode}_${nextN}`;
    const filename  = `${imageName}.${ext}`;
    const uploadsDir = DESIGNS_DIR();
    await fs.promises.mkdir(uploadsDir, { recursive: true });
    await fs.promises.writeFile(path.join(uploadsDir, filename), Buffer.from(b64, 'base64'));

    const imageUrl = `/uploads/designs/${filename}?v=${Date.now()}`;
    const isFirst  = nextN === 1;

    const inserted = await prisma.design_images.create({
      data: { design_id: designId, image_name: imageName, image_url: imageUrl, is_default: isFirst, sort_order: nextN },
    });

    if (isFirst) {
      await prisma.design_master.update({
        where: { id: designId },
        data: { design_image: imageUrl, updated_at: new Date() },
      });
    }

    sendSuccess(res, inserted, 'Photo added');
  } catch (error) {
    sendError(res, `Failed to add design photo: ${(error as Error).message}`);
  }
};

/**
 * PUT /api/v1/masters/design/:id/photos/:imageId/default
 * Set one image as the default; clears default flag on all others.
 */
export const setDesignPhotoDefault = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const designId  = parseInt(req.params.id, 10);
    const imageId   = parseInt(req.params.imageId, 10);
    if (!designId || !imageId) { sendValidationError(res, 'Valid ids required'); return; }

    await prisma.design_images.updateMany({ where: { design_id: designId }, data: { is_default: false } });
    await prisma.design_images.updateMany({ where: { id: imageId, design_id: designId }, data: { is_default: true } });

    const img = await prisma.design_images.findUnique({ where: { id: imageId }, select: { image_url: true } });
    if (img) {
      await prisma.design_master.update({
        where: { id: designId },
        data: { design_image: img.image_url, updated_at: new Date() },
      });
    }
    sendSuccess(res, {}, 'Default image updated');
  } catch (error) {
    sendError(res, `Failed to set default: ${(error as Error).message}`);
  }
};

/**
 * DELETE /api/v1/masters/design/:id/photos/:imageId
 * Soft-delete a design image. If it was the default, promote the next image.
 */
export const deleteDesignPhoto = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const designId = parseInt(req.params.id, 10);
    const imageId  = parseInt(req.params.imageId, 10);
    if (!designId || !imageId) { sendValidationError(res, 'Valid ids required'); return; }

    const img = await prisma.design_images.findFirst({
      where: { id: imageId, design_id: designId },
      select: { is_default: true },
    });
    if (!img) { sendValidationError(res, 'Image not found'); return; }
    const wasDefault = img.is_default;

    await prisma.design_images.update({ where: { id: imageId }, data: { is_active: false, is_default: false } });

    if (wasDefault) {
      const nextImg = await prisma.design_images.findFirst({
        where: { design_id: designId, is_active: true },
        select: { id: true, image_url: true },
        orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
      });
      if (nextImg) {
        await prisma.design_images.update({ where: { id: nextImg.id }, data: { is_default: true } });
        await prisma.design_master.update({
          where: { id: designId },
          data: { design_image: nextImg.image_url, updated_at: new Date() },
        });
      } else {
        await prisma.design_master.update({
          where: { id: designId },
          data: { design_image: null, updated_at: new Date() },
        });
      }
    }
    sendSuccess(res, {}, 'Photo deleted');
  } catch (error) {
    sendError(res, `Failed to delete photo: ${(error as Error).message}`);
  }
};

const VARIANT_DOC_DIR = () => path.join(__dirname, '../../uploads/variant_docs');

const VARIANT_DOC_EXTENSIONS: Record<string, string[]> = {
  cad:      ['dwg', 'dxf', 'step', 'stp', 'stl', '3dm', 'igs', 'iges'],
  drawing:  ['pdf', 'jpg', 'jpeg', 'png'],
  techdoc:  ['pdf', 'doc', 'docx', 'xls', 'xlsx'],
  video:    ['mp4', 'mov'],
  video360: ['mp4', 'mov'],
};

const VARIANT_DOC_MAX_BYTES: Record<string, number> = {
  cad: 25 * 1024 * 1024,
  drawing: 25 * 1024 * 1024,
  techdoc: 25 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  video360: 50 * 1024 * 1024,
};

/**
 * POST /api/v1/masters/document-upload
 * Stateless single-file upload shared by: the "Add New Variant" Casting
 * tab (CAD File, Manufacturing Drawing, Technical Documents) and the item
 * header's Media tab (Video Upload URL, 360° Video URL). There's no
 * variant/item id yet when a *new* record's docs are attached, so this
 * endpoint just stores the file under a random name and hands back a
 * URL — the caller saves that URL onto its own form field the same way
 * every other field is saved (via the normal create/update call).
 */
export const uploadDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { doc_type, file_name, data } = req.body as { doc_type?: string; file_name?: string; data?: string };

    const allowedExt = doc_type ? VARIANT_DOC_EXTENSIONS[doc_type] : undefined;
    if (!allowedExt) {
      sendValidationError(res, 'doc_type must be one of: cad, drawing, techdoc, video, video360');
      return;
    }
    if (!file_name || !data) {
      sendValidationError(res, 'file_name and data are required');
      return;
    }

    const ext = path.extname(file_name).slice(1).toLowerCase();
    if (!ext || !allowedExt.includes(ext)) {
      sendValidationError(res, `Unsupported file type ".${ext || '?'}" for this field. Allowed: ${allowedExt.join(', ')}`);
      return;
    }

    const maxBytes = VARIANT_DOC_MAX_BYTES[doc_type as string];
    const match = data.match(/^data:.*?;base64,(.+)$/s);
    const b64 = match ? match[1] : data;
    if (b64.length > (maxBytes * 4) / 3) {
      sendValidationError(res, `File must be under ${Math.round(maxBytes / (1024 * 1024))} MB`);
      return;
    }

    const uploadsDir = VARIANT_DOC_DIR();
    try {
      await fs.promises.mkdir(uploadsDir, { recursive: true });
    } catch (mkdirErr) {
      logger.error(`[document-upload] Cannot create directory: ${uploadsDir}`, mkdirErr);
      sendError(res, `Upload directory error: ${(mkdirErr as NodeJS.ErrnoException).message}`);
      return;
    }

    const unique = `${doc_type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = path.join(uploadsDir, unique);
    try {
      await fs.promises.writeFile(filePath, Buffer.from(b64, 'base64'));
    } catch (writeErr) {
      logger.error(`[document-upload] Cannot write file: ${filePath}`, writeErr);
      sendError(res, `File write error: ${(writeErr as NodeJS.ErrnoException).message}`);
      return;
    }

    const url = `/uploads/variant_docs/${unique}`;
    logger.info(`[document-upload] Saved: ${unique} (doc_type=${doc_type}, original=${file_name})`);
    sendSuccess(res, { url, file_name }, 'Document uploaded');
  } catch (error) {
    logger.error('[document-upload] Unexpected error', error);
    sendError(res, `Failed to upload document: ${(error as Error).message}`);
  }
};

const ITEM_MEDIA_DIR = () => path.join(__dirname, '../../uploads/item_media');

const ITEM_MEDIA_EXTENSIONS = {
  image: ['jpg', 'jpeg', 'png', 'webp'],
  video: ['mp4', 'mov'],
} as const;

const ITEM_MEDIA_MAX_BYTES = {
  image: 5 * 1024 * 1024,
  video: 50 * 1024 * 1024,
} as const;

const isValidMasterType = (v: unknown): v is 'fg' | 'fin' => v === 'fg' || v === 'fin';

/**
 * GET /api/v1/masters/item-media/:masterType/:itemId
 * Returns all active gallery media (images + videos) for an FG/Finding item.
 */
export const getItemMedia = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { masterType } = req.params;
    const itemId = parseInt(req.params.itemId, 10);
    if (!isValidMasterType(masterType)) { sendValidationError(res, 'masterType must be fg or fin'); return; }
    if (!itemId || isNaN(itemId)) { sendValidationError(res, 'Valid item id is required'); return; }

    const select = { id: true, media_type: true, media_name: true, media_url: true, is_default: true, sort_order: true } as const;
    const orderBy = [{ sort_order: 'asc' as const }, { id: 'asc' as const }];

    const rows = masterType === 'fg'
      ? await prisma.fg_item_media.findMany({ where: { item_id: itemId, is_active: true }, select, orderBy })
      : await prisma.fin_item_media.findMany({ where: { item_id: itemId, is_active: true }, select, orderBy });
    sendSuccess(res, rows);
  } catch (error) {
    sendError(res, `Failed to load media: ${(error as Error).message}`);
  }
};

/**
 * POST /api/v1/masters/item-media/:masterType/:itemId
 * Accepts a base64 data-URI image or video; media_type is inferred from the
 * uploaded file's extension. The first item uploaded becomes the default
 * automatically — "default" only carries meaning for images (the gallery's
 * lead thumbnail), never for videos.
 */
export const addItemMedia = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { masterType } = req.params;
    const itemId = parseInt(req.params.itemId, 10);
    if (!isValidMasterType(masterType)) { sendValidationError(res, 'masterType must be fg or fin'); return; }
    if (!itemId || isNaN(itemId)) { sendValidationError(res, 'Valid item id is required'); return; }

    const { file_name, data } = req.body as { file_name?: string; data?: string };
    if (!file_name || !data) { sendValidationError(res, 'file_name and data are required'); return; }

    const ext = path.extname(file_name).slice(1).toLowerCase();
    const mediaType: 'image' | 'video' | null =
      (ITEM_MEDIA_EXTENSIONS.image as readonly string[]).includes(ext) ? 'image'
      : (ITEM_MEDIA_EXTENSIONS.video as readonly string[]).includes(ext) ? 'video'
      : null;
    if (!mediaType) {
      sendValidationError(res, `Unsupported file type ".${ext || '?'}". Allowed: ${ITEM_MEDIA_EXTENSIONS.image.join(', ')} (images), ${ITEM_MEDIA_EXTENSIONS.video.join(', ')} (videos)`);
      return;
    }

    const match = data.match(/^data:.*?;base64,(.+)$/s);
    const b64 = match ? match[1] : data;
    const maxBytes = ITEM_MEDIA_MAX_BYTES[mediaType];
    if (b64.length > (maxBytes * 4) / 3) {
      sendValidationError(res, `File must be under ${Math.round(maxBytes / (1024 * 1024))} MB`);
      return;
    }

    const uploadsDir = ITEM_MEDIA_DIR();
    await fs.promises.mkdir(uploadsDir, { recursive: true });
    const unique = `${masterType}_${itemId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    await fs.promises.writeFile(path.join(uploadsDir, unique), Buffer.from(b64, 'base64'));
    const url = `/uploads/item_media/${unique}`;

    const existingCount = masterType === 'fg'
      ? await prisma.fg_item_media.count({ where: { item_id: itemId, is_active: true } })
      : await prisma.fin_item_media.count({ where: { item_id: itemId, is_active: true } });
    const isFirst = existingCount === 0;
    const data_ = { item_id: itemId, media_type: mediaType, media_name: file_name, media_url: url, is_default: isFirst, sort_order: existingCount + 1 };

    const inserted = masterType === 'fg'
      ? await prisma.fg_item_media.create({ data: data_ })
      : await prisma.fin_item_media.create({ data: data_ });

    sendSuccess(res, inserted, 'Media added');
  } catch (error) {
    sendError(res, `Failed to add media: ${(error as Error).message}`);
  }
};

/**
 * PUT /api/v1/masters/item-media/:masterType/:itemId/:mediaId/default
 * Only images can be the gallery's default thumbnail.
 */
export const setItemMediaDefault = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { masterType } = req.params;
    const itemId = parseInt(req.params.itemId, 10);
    const mediaId = parseInt(req.params.mediaId, 10);
    if (!isValidMasterType(masterType)) { sendValidationError(res, 'masterType must be fg or fin'); return; }
    if (!itemId || !mediaId) { sendValidationError(res, 'Valid ids required'); return; }

    if (masterType === 'fg') {
      const media = await prisma.fg_item_media.findFirst({ where: { id: mediaId, item_id: itemId }, select: { media_type: true } });
      if (!media) { sendValidationError(res, 'Media not found'); return; }
      if (media.media_type !== 'image') { sendValidationError(res, 'Only images can be set as default'); return; }
      await prisma.fg_item_media.updateMany({ where: { item_id: itemId }, data: { is_default: false } });
      await prisma.fg_item_media.update({ where: { id: mediaId }, data: { is_default: true } });
    } else {
      const media = await prisma.fin_item_media.findFirst({ where: { id: mediaId, item_id: itemId }, select: { media_type: true } });
      if (!media) { sendValidationError(res, 'Media not found'); return; }
      if (media.media_type !== 'image') { sendValidationError(res, 'Only images can be set as default'); return; }
      await prisma.fin_item_media.updateMany({ where: { item_id: itemId }, data: { is_default: false } });
      await prisma.fin_item_media.update({ where: { id: mediaId }, data: { is_default: true } });
    }
    sendSuccess(res, {}, 'Default media updated');
  } catch (error) {
    sendError(res, `Failed to set default: ${(error as Error).message}`);
  }
};

/**
 * DELETE /api/v1/masters/item-media/:masterType/:itemId/:mediaId
 * Soft-delete. If the deleted item was the default, promotes the next
 * remaining image (never a video) as the new default.
 */
export const deleteItemMedia = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { masterType } = req.params;
    const itemId = parseInt(req.params.itemId, 10);
    const mediaId = parseInt(req.params.mediaId, 10);
    if (!isValidMasterType(masterType)) { sendValidationError(res, 'masterType must be fg or fin'); return; }
    if (!itemId || !mediaId) { sendValidationError(res, 'Valid ids required'); return; }

    const orderBy = [{ sort_order: 'asc' as const }, { id: 'asc' as const }];

    if (masterType === 'fg') {
      const media = await prisma.fg_item_media.findFirst({ where: { id: mediaId, item_id: itemId }, select: { is_default: true } });
      if (!media) { sendValidationError(res, 'Media not found'); return; }
      await prisma.fg_item_media.update({ where: { id: mediaId }, data: { is_active: false, is_default: false } });
      if (media.is_default) {
        const next = await prisma.fg_item_media.findFirst({ where: { item_id: itemId, is_active: true, media_type: 'image' }, orderBy });
        if (next) await prisma.fg_item_media.update({ where: { id: next.id }, data: { is_default: true } });
      }
    } else {
      const media = await prisma.fin_item_media.findFirst({ where: { id: mediaId, item_id: itemId }, select: { is_default: true } });
      if (!media) { sendValidationError(res, 'Media not found'); return; }
      await prisma.fin_item_media.update({ where: { id: mediaId }, data: { is_active: false, is_default: false } });
      if (media.is_default) {
        const next = await prisma.fin_item_media.findFirst({ where: { item_id: itemId, is_active: true, media_type: 'image' }, orderBy });
        if (next) await prisma.fin_item_media.update({ where: { id: next.id }, data: { is_default: true } });
      }
    }
    sendSuccess(res, {}, 'Media deleted');
  } catch (error) {
    sendError(res, `Failed to delete media: ${(error as Error).message}`);
  }
};

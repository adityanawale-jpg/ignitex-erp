import { Router } from 'express';
import {
  uploadDesignPhoto, getDesignPhotos, addDesignPhoto, setDesignPhotoDefault, deleteDesignPhoto,
  uploadDocument,
  getItemMedia, addItemMedia, setItemMediaDefault, deleteItemMedia,
} from '../controllers/masters.controller';
import { validateToken } from '../middleware/auth.middleware';

const router = Router();

router.put   ('/design/:id/photo',                    validateToken, uploadDesignPhoto);
router.get   ('/design/:id/photos',                   validateToken, getDesignPhotos);
router.post  ('/design/:id/photos',                   validateToken, addDesignPhoto);
router.put   ('/design/:id/photos/:imageId/default',  validateToken, setDesignPhotoDefault);
router.delete('/design/:id/photos/:imageId',          validateToken, deleteDesignPhoto);

router.post  ('/document-upload',                             validateToken, uploadDocument);

router.get   ('/item-media/:masterType/:itemId',              validateToken, getItemMedia);
router.post  ('/item-media/:masterType/:itemId',               validateToken, addItemMedia);
router.put   ('/item-media/:masterType/:itemId/:mediaId/default', validateToken, setItemMediaDefault);
router.delete('/item-media/:masterType/:itemId/:mediaId',      validateToken, deleteItemMedia);

export default router;

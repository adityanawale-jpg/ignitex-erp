import React from 'react'
import {
  Home, Database, Package, ShoppingBag, Truck, Banknote,
  BarChart3, Settings, Gem, Mail, Factory, ShieldCheck,
  Link2, Calendar, RefreshCw, Layers, Sparkles, ClipboardList,
  Globe, Users, Settings2, AlertTriangle, ClipboardCheck,
  UserCircle, Tag, Folder, List, Wrench, IndianRupee,
} from 'lucide-react'

// Single source of truth for menu icon name → Lucide component.
// Both Sidebar and WelcomeHome import from here so they're always in sync.
export const menuIconMap: Record<string, React.ReactNode> = {
  HomeIcon:          <Home />,
  CircleStackIcon:   <Database />,
  CubeIcon:          <Package />,
  ShoppingBagIcon:   <ShoppingBag />,
  TruckIcon:         <Truck />,
  BanknotesIcon:     <Banknote />,
  ChartBarIcon:      <BarChart3 />,
  Cog6ToothIcon:     <Settings />,
  UserGroupIcon:     <Users />,
  UsersIcon:         <Users />,
  TagIcon:           <Tag />,
  CurrencyRupeeIcon: <IndianRupee />,
  BeakerIcon:        <Database />,
  FolderIcon:        <Folder />,
  ListBulletIcon:    <List />,
  EnvelopeIcon:      <Mail />,
  FactoryIcon:       <Factory />,
  ShieldCheckIcon:   <ShieldCheck />,
  LinkIcon:          <Link2 />,
  CalendarIcon:      <Calendar />,
  RefreshCwIcon:     <RefreshCw />,
  LayersIcon:        <Layers />,
  SparklesIcon:      <Sparkles />,
  ClipboardListIcon: <ClipboardList />,
  GlobeIcon:         <Globe />,
  GemIcon:           <Gem />,
  Settings2:         <Settings2 />,
  AlertTriangle:     <AlertTriangle />,
  ClipboardCheck:    <ClipboardCheck />,
  ClipboardList:     <ClipboardList />,
  UserCircle:        <UserCircle />,
  WrenchIcon:        <Wrench />,
}

// Sidebar uses fixed 16px (w-4 h-4)
export const getSidebarIcon = (iconName?: string | null): React.ReactNode => {
  const icon = iconName ? menuIconMap[iconName] : null
  const el   = icon ?? <Home />
  return React.cloneElement(el as React.ReactElement, { className: 'w-4 h-4' })
}

// WelcomeHome uses variable size
export const getMenuIcon = (iconName?: string | null, size = 20): React.ReactNode => {
  const icon = iconName ? menuIconMap[iconName] : null
  const el   = icon ?? <Gem />
  return React.cloneElement(el as React.ReactElement, { style: { width: size, height: size } })
}

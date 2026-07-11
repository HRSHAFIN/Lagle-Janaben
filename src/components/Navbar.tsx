import { ShoppingBag, LayoutDashboard } from 'lucide-react';
import { ViewType } from '../types';
import Logo from './Logo';

interface NavbarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  cartCount: number;
  onCartClick: () => void;
}

export default function Navbar({ currentView, onViewChange, cartCount, onCartClick }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md" id="store-header">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo / Brand Name */}
        <div 
          className="flex cursor-pointer items-center space-x-2.5" 
          onClick={() => onViewChange('catalog')}
          id="brand-logo"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-gray-100 shadow-sm">
            <Logo className="h-7 w-7" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-1.5">
              <span className="font-sans text-lg font-extrabold tracking-tight leading-none">
                <span className="text-[#1E2D44]">Lagle</span>{" "}
                <span className="text-[#B88E4C]">Janaben</span>
              </span>
              <span className="rounded bg-amber-50 border border-amber-200/60 px-1 py-0.5 font-sans text-[8px] font-semibold text-amber-700 tracking-wider uppercase leading-none">Gifts</span>
            </div>
            <span className="font-sans text-[9px] text-gray-400 font-medium leading-tight mt-0.5">Gifts that connect Hearts</span>
          </div>
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center space-x-4">
          <button
            id="nav-shop-btn"
            onClick={() => onViewChange('catalog')}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-2 font-sans text-sm font-medium transition-colors ${
              currentView === 'catalog' || currentView === 'checkout' || currentView === 'order-success' || currentView === 'product-detail'
                ? 'bg-gray-50 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Shop</span>
          </button>

          <button
            id="nav-admin-btn"
            onClick={() => onViewChange('admin')}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-2 font-sans text-sm font-medium transition-colors ${
              currentView === 'admin'
                ? 'bg-gray-50 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Admin Panel</span>
          </button>

          {/* Vertical Divider */}
          <span className="h-5 w-px bg-gray-200" aria-hidden="true" />

          {/* Cart Icon Button */}
          <button
            id="nav-cart-btn"
            onClick={onCartClick}
            className="group relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-100 bg-white shadow-sm transition-all hover:bg-gray-50 active:scale-95"
            aria-label="Shopping Cart"
          >
            <ShoppingBag className="h-4.5 w-4.5 text-gray-700 transition-transform group-hover:scale-105" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 font-mono text-[10px] font-bold text-white ring-2 ring-white animate-in zoom-in-50 duration-200">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

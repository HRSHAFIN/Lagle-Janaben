import { useState } from 'react';
import { ShoppingBag, LayoutDashboard, LogOut, User as UserIcon } from 'lucide-react';
import { User, ViewType } from '../types';
import Logo from './Logo';

interface NavbarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  cartCount: number;
  onCartClick: () => void;
  currentUser: User | null;
  onLogout: () => void;
}

export default function Navbar({ currentView, onViewChange, cartCount, onCartClick, currentUser, onLogout }: NavbarProps) {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md" id="store-header">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-2.5 sm:px-6 lg:px-8">
        {/* Logo / Brand Name */}
        <div 
          className="flex cursor-pointer items-center space-x-1.5 sm:space-x-2.5" 
          onClick={() => onViewChange('catalog')}
          id="brand-logo"
        >
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white border border-gray-100 shadow-sm">
            <Logo className="h-5.5 w-5.5 sm:h-7 sm:w-7" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-1 sm:space-x-1.5">
              <span className="font-sans text-sm sm:text-base md:text-lg font-extrabold tracking-tight leading-none whitespace-nowrap">
                <span className="text-[#1E2D44]">Lagle</span>{" "}
                <span className="text-[#B88E4C]">Janaben</span>
              </span>
              <span className="rounded bg-amber-50 border border-amber-200/60 px-1 py-0.5 font-sans text-[8px] font-semibold text-amber-700 tracking-wider uppercase leading-none hidden min-[400px]:inline-block">Gifts</span>
            </div>
            <span className="font-sans text-[9px] text-gray-400 font-medium leading-tight mt-0.5 hidden sm:block">Gifts that connect Hearts</span>
          </div>
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center space-x-1.5 sm:space-x-4">
          <button
            id="nav-shop-btn"
            onClick={() => onViewChange('catalog')}
            className={`flex items-center space-x-1 rounded-lg px-2 py-2 sm:px-3 sm:space-x-1.5 font-sans text-xs sm:text-sm font-medium transition-colors ${
              currentView === 'catalog' || currentView === 'checkout' || currentView === 'order-success' || currentView === 'product-detail'
                ? 'bg-gray-50 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Shop</span>
          </button>

          <button
            id="nav-admin-btn"
            onClick={() => onViewChange('admin')}
            className={`flex items-center space-x-1 rounded-lg px-2 py-2 sm:px-3 sm:space-x-1.5 font-sans text-xs sm:text-sm font-medium transition-colors ${
              currentView === 'admin'
                ? 'bg-gray-50 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Admin Panel</span>
            <span className="inline sm:hidden">Admin</span>
          </button>

          {/* Vertical Divider */}
          <span className="h-5 w-px bg-gray-200" aria-hidden="true" />

          {/* Account: Sign In / User Menu */}
          {currentUser ? (
            <div className="relative">
              <button
                id="nav-account-btn"
                onClick={() => setAccountMenuOpen((v) => !v)}
                className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-[#1E2D44] font-sans text-xs sm:text-sm font-bold text-white shadow-sm transition-transform active:scale-95"
                aria-label="Account menu"
              >
                {currentUser.name.trim().charAt(0).toUpperCase() || 'U'}
              </button>

              {accountMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setAccountMenuOpen(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-gray-100 bg-white p-2 shadow-lg animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-gray-50 mb-1">
                      <p className="font-sans text-sm font-semibold text-gray-900 truncate">{currentUser.name}</p>
                      <p className="font-sans text-xs text-gray-400 truncate">{currentUser.email}</p>
                    </div>
                    <button
                      id="nav-logout-btn"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onLogout();
                      }}
                      className="flex w-full items-center space-x-2 rounded-lg px-3 py-2 font-sans text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              id="nav-login-btn"
              onClick={() => onViewChange('login')}
              className={`flex items-center space-x-1 rounded-lg px-2 py-2 sm:px-3 sm:space-x-1.5 font-sans text-xs sm:text-sm font-medium transition-colors ${
                currentView === 'login' || currentView === 'register'
                  ? 'bg-gray-50 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <UserIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}

          {/* Cart Icon Button */}
          <button
            id="nav-cart-btn"
            onClick={onCartClick}
            className="group relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-gray-100 bg-white shadow-sm transition-all hover:bg-gray-50 active:scale-95"
            aria-label="Shopping Cart"
          >
            <ShoppingBag className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-gray-700 transition-transform group-hover:scale-105" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-gray-900 font-mono text-[9px] sm:text-[10px] font-bold text-white ring-2 ring-white animate-in zoom-in-50 duration-200">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

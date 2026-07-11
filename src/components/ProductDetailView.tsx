import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { ArrowLeft, Star, ShoppingBag, CreditCard, ShieldCheck, Truck, RefreshCw, Gift } from 'lucide-react';

interface ProductDetailViewProps {
  product: Product;
  allProducts: Product[];
  onAddToCartWithQty: (product: Product, quantity: number) => void;
  onInstantCheckout: (product: Product, quantity: number) => void;
  onBackToCatalog: () => void;
  onSelectProduct: (product: Product) => void;
}

export default function ProductDetailView({
  product,
  allProducts,
  onAddToCartWithQty,
  onInstantCheckout,
  onBackToCatalog,
  onSelectProduct,
}: ProductDetailViewProps) {
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'details' | 'specs' | 'shipping'>('details');

  // List of all images for the product
  const allImages = Array.from(new Set([product.image, ...(product.images || [])])).filter(Boolean);
  const [activeImage, setActiveImage] = useState(product.image);

  // Reset quantity and active image when product changes
  useEffect(() => {
    setQuantity(1);
    setActiveImage(product.image);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [product]);

  const handleIncrement = () => {
    if (quantity < product.inventory) {
      setQuantity((prev) => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  // Structured custom content based on categories/names
  const getExtendedDetails = (p: Product) => {
    const isTech = p.category.toLowerCase() === 'technology';
    const isAccessory = p.category.toLowerCase() === 'accessories';
    const isApparel = p.category.toLowerCase() === 'apparel';

    let material = "Sourced from local sustainable premium workshops in Bangladesh";
    let dimensions = "Standard size fits most";
    let boxContent = `1x ${p.name}, Curated Gift Box Wrap, Personalized Handwritten Card (Optional), Premium Wax Seal Ribbon.`;

    if (p.id === 'prod-1') {
      material = "Premium hybrid composite, high-density memory foam leatherette, lightweight alloy joints";
      dimensions = "180mm x 165mm x 80mm | Weight: 260g";
    } else if (p.id === 'prod-2' || p.id === 'prod-8') {
      material = "Premium full-grain vegetable-tanned Bangladeshi leather, solid brass hardware, organic cotton lining";
      dimensions = p.id === 'prod-2' ? "42cm x 30cm x 15cm (Holds up to 16\" laptop)" : "10cm x 7.5cm x 0.6cm (Slim profile)";
    } else if (p.id === 'prod-3') {
      material = "Surgical-grade 316L stainless steel, sapphire-coated crystal glass, genuine leather interchangeable strap";
      dimensions = "Case Diameter: 40mm | Case Thickness: 7.2mm | Strap Width: 20mm";
    } else if (p.id === 'prod-4') {
      material = "Anodized CNC aluminum top case, double-shot PBT keycaps, high-lubricity mechanical switches";
      dimensions = "315mm x 125mm x 38mm | Weight: 980g";
    } else if (p.id === 'prod-5') {
      material = "Double-walled borosilicate thermal glass, high-temperature glazed stoneware ceramic dripper";
      dimensions = "Dripper: Size 02 (1-4 cups) | Server Capacity: 600ml";
    } else if (p.id === 'prod-6') {
      material = "Solid C360 solid cartridge brass, polished satin finish, natural heavy anti-oxidation coating";
      dimensions = "140mm x 60mm x 55mm | Weight: 420g";
    } else if (isApparel) {
      material = "100% Organic long-staple combed cotton / Extrafine Merino wool, zero toxic dyes, pre-shrunk premium weave";
      dimensions = "Classic regular modern fit. View sizing chart for custom measurements.";
    }

    return { material, dimensions, boxContent };
  };

  const extraDetails = getExtendedDetails(product);

  // Filter 3 related products
  const relatedProducts = allProducts
    .filter((p) => p.id !== product.id && p.status === 'Active')
    .filter((p) => p.category === product.category || p.featured)
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" id="product-detail-container">
      {/* Back Button Navigation */}
      <button
        onClick={onBackToCatalog}
        className="group mb-8 flex items-center space-x-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        id="back-to-catalog-btn"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        <span>Back to Curated Collection</span>
      </button>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        
        {/* Left Grid: Images & Brand Tag (5 Cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-gray-100 bg-gray-50/50 shadow-sm group">
            <img
              src={activeImage || product.image}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover object-center transition-transform duration-700 hover:scale-105"
            />
            {product.featured && (
              <span className="absolute top-4 left-4 rounded-full bg-[#1E2D44] px-3.5 py-1 font-sans text-[10px] font-bold text-white uppercase tracking-wider">
                Signature Gift
              </span>
            )}
          </div>

          {/* Thumbnail Gallery */}
          {allImages.length > 1 && (
            <div className="flex flex-wrap gap-2.5 pt-1" id="product-thumbnails">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  type="button"
                  className={`relative h-16 w-16 sm:h-20 sm:w-20 overflow-hidden rounded-xl border-2 transition-all bg-gray-50/30 ${
                    activeImage === img
                      ? 'border-[#B88E4C] ring-2 ring-amber-100'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img
                    src={img}
                    alt={`${product.name} gallery ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover object-center"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Mini Trust Bullet Highlights */}
          <div className="grid grid-cols-3 gap-4 py-4 border-y border-gray-100">
            <div className="flex flex-col items-center text-center p-2">
              <Gift className="h-5 w-5 text-[#B88E4C] mb-1.5" />
              <span className="font-sans text-[11px] font-bold text-gray-900">Elegant Wrap</span>
              <span className="font-sans text-[9px] text-gray-400 mt-0.5">Premium curated box</span>
            </div>
            <div className="flex flex-col items-center text-center p-2">
              <Truck className="h-5 w-5 text-[#B88E4C] mb-1.5" />
              <span className="font-sans text-[11px] font-bold text-gray-900">Fast Delivery</span>
              <span className="font-sans text-[9px] text-gray-400 mt-0.5">Nationwide inside BD</span>
            </div>
            <div className="flex flex-col items-center text-center p-2">
              <RefreshCw className="h-5 w-5 text-[#B88E4C] mb-1.5" />
              <span className="font-sans text-[11px] font-bold text-gray-900">Authentic Only</span>
              <span className="font-sans text-[9px] text-gray-400 mt-0.5">100% original crafted</span>
            </div>
          </div>
        </div>

        {/* Right Grid: Buying Options & Deep Custom Content (6 Cols) */}
        <div className="lg:col-span-6 flex flex-col justify-between text-left">
          <div>
            {/* Category and Rating */}
            <div className="flex items-center justify-between">
              <span className="rounded bg-amber-50 border border-amber-200/50 px-2.5 py-0.5 font-sans text-xs font-semibold text-amber-800 tracking-wide uppercase">
                {product.category}
              </span>
              <div className="flex items-center space-x-1">
                <div className="flex items-center text-amber-400">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="ml-1 font-sans text-sm font-bold text-gray-900">{product.rating}</span>
                </div>
                <span className="font-sans text-xs text-gray-400 font-medium">• 48 Verified Reviews</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="mt-3 font-sans text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-gray-950">
              {product.name}
            </h1>

            {/* Price tag */}
            <p className="mt-4 font-mono text-2xl sm:text-3xl font-extrabold text-[#B88E4C]">
              ৳{product.price.toFixed(2)}
            </p>

            {/* Core Description */}
            <p className="mt-6 font-sans text-base text-gray-600 leading-relaxed">
              {product.description}
            </p>

            {/* Stock / Inventory indicators */}
            <div className="mt-6 flex items-center space-x-2">
              {product.inventory > 0 ? (
                <>
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="font-sans text-xs font-medium text-emerald-700">
                    {product.inventory <= 5 
                      ? `Urgent: Only ${product.inventory} gift items left in stock!` 
                      : `In Stock: ${product.inventory} items ready to ship today`}
                  </span>
                </>
              ) : (
                <>
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500"></span>
                  <span className="font-sans text-xs font-medium text-red-600">
                    Out of Stock - Custom back-order available (Contact support)
                  </span>
                </>
              )}
            </div>

            {/* Tabs for Structured details */}
            <div className="mt-8 border-b border-gray-100">
              <div className="flex space-x-6">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`pb-3 font-sans text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                    activeTab === 'details'
                      ? 'border-[#B88E4C] text-gray-950'
                      : 'border-transparent text-gray-400 hover:text-gray-900'
                  }`}
                >
                  Unboxing & Gift-Wrap
                </button>
                <button
                  onClick={() => setActiveTab('specs')}
                  className={`pb-3 font-sans text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                    activeTab === 'specs'
                      ? 'border-[#B88E4C] text-gray-950'
                      : 'border-transparent text-gray-400 hover:text-gray-900'
                  }`}
                >
                  Materials & Size
                </button>
                <button
                  onClick={() => setActiveTab('shipping')}
                  className={`pb-3 font-sans text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                    activeTab === 'shipping'
                      ? 'border-[#B88E4C] text-gray-950'
                      : 'border-transparent text-gray-400 hover:text-gray-900'
                  }`}
                >
                  Shipping & Gifting
                </button>
              </div>
            </div>

            <div className="py-5 font-sans text-sm text-gray-500 leading-relaxed">
              {activeTab === 'details' && (
                <div className="space-y-2">
                  <p><strong className="text-gray-800">Perfect Gift Experience:</strong> Each order is carefully placed inside our custom hot-stamped black craft cardboard box, lined with protective fine silk paper, and tied with a beautiful golden mustard satin ribbon finished with an authentic hand-pressed wax seal representing <strong>Lagle Janaben</strong>.</p>
                  <p><strong className="text-gray-800">Box Contents:</strong> {extraDetails.boxContent}</p>
                </div>
              )}
              {activeTab === 'specs' && (
                <div className="space-y-2">
                  <p><strong className="text-gray-800">Premium Raw Materials:</strong> {extraDetails.material}</p>
                  <p><strong className="text-gray-800">Precise Product Dimensions:</strong> {extraDetails.dimensions}</p>
                </div>
              )}
              {activeTab === 'shipping' && (
                <div className="space-y-2">
                  <p><strong className="text-gray-800">Nationwide Gifting Network:</strong> We deliver everywhere in Bangladesh. Your order can be shipped to your address or straight to the recipient's doorstep as a sweet surprise!</p>
                  <p><strong className="text-gray-800">Delivery Timelines:</strong> Dhaka Metropolitan: 24 to 48 hours. Out of Dhaka (Divisional Cities & districts): 3 to 5 business days via premium delivery partners.</p>
                </div>
              )}
            </div>

            {/* Buying Action Section */}
            {product.inventory > 0 && (
              <div className="mt-8 p-5 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-sm font-semibold text-gray-800">Select Quantity</span>
                  
                  {/* Qty picker */}
                  <div className="flex items-center rounded-lg border border-gray-200 bg-white p-1">
                    <button
                      onClick={handleDecrement}
                      disabled={quantity <= 1}
                      className="px-2.5 py-1 text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      -
                    </button>
                    <span className="px-4 font-mono text-sm font-semibold text-gray-900">{quantity}</span>
                    <button
                      onClick={handleIncrement}
                      disabled={quantity >= product.inventory}
                      className="px-2.5 py-1 text-gray-500 hover:text-gray-800 disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Subtotal preview */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs">
                  <span className="text-gray-400 font-medium">Subtotal for {quantity} item(s)</span>
                  <span className="font-mono font-bold text-gray-900">৳{(product.price * quantity).toFixed(2)}</span>
                </div>

                {/* Action CTA Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {/* Add to Cart */}
                  <button
                    onClick={() => onAddToCartWithQty(product, quantity)}
                    className="flex w-full items-center justify-center space-x-2 rounded-xl border border-gray-300 bg-white py-3 font-sans text-sm font-bold text-gray-800 hover:bg-gray-50 active:scale-[0.98] transition-all shadow-sm"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    <span>Add to Cart</span>
                  </button>

                  {/* Buy Now / Checkout instantly */}
                  <button
                    onClick={() => onInstantCheckout(product, quantity)}
                    className="flex w-full items-center justify-center space-x-2 rounded-xl bg-[#1E2D44] hover:bg-[#152031] text-white py-3 font-sans text-sm font-bold active:scale-[0.98] transition-all shadow"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Buy Now (Checkout)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Security Notice */}
            <div className="mt-4 flex items-center justify-center space-x-1.5 text-xs text-gray-400">
              <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span>Payments processed via 100% Secured SSLCommerz Transaction Network</span>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <div className="mt-24 border-t border-gray-100 pt-12" id="related-gifts-section">
          <h2 className="font-sans text-xl sm:text-2xl font-extrabold tracking-tight text-gray-950 text-left mb-8">
            Curated Gifts You May Also Love
          </h2>

          <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3" id="related-gifts-grid">
            {relatedProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => onSelectProduct(p)}
                className="group cursor-pointer relative flex flex-col justify-between text-left"
              >
                {/* Image */}
                <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-gray-100 bg-gray-50 transition-all group-hover:shadow-md">
                  <img
                    src={p.image}
                    alt={p.name}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  />
                  {p.featured && (
                    <span className="absolute top-3 left-3 rounded-full bg-[#1E2D44] px-2.5 py-0.5 font-sans text-[9px] font-bold text-white uppercase tracking-wider">
                      Featured
                    </span>
                  )}
                </div>

                {/* Text */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    <span>{p.category}</span>
                    <div className="flex items-center text-amber-400">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400 mr-0.5" />
                      <span className="text-gray-500 font-mono text-[11px]">{p.rating}</span>
                    </div>
                  </div>
                  <h3 className="mt-1 font-sans text-sm font-bold text-gray-900 group-hover:text-amber-700 transition-colors line-clamp-1">
                    {p.name}
                  </h3>
                  <p className="mt-1 font-mono text-sm font-extrabold text-[#B88E4C]">
                    ৳{p.price.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

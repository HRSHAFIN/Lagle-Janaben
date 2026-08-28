-- Preserve the hand-written material/dimensions copy that used to be
-- hardcoded by product id inside ProductDetailView.tsx — now data-driven.

UPDATE public.products SET
  material = 'Premium hybrid composite, high-density memory foam leatherette, lightweight alloy joints',
  dimensions = '180mm x 165mm x 80mm | Weight: 260g'
WHERE name = 'Aero Wireless Headphones';

UPDATE public.products SET
  material = 'Premium full-grain vegetable-tanned Bangladeshi leather, solid brass hardware, organic cotton lining',
  dimensions = '42cm x 30cm x 15cm (Holds up to 16" laptop)'
WHERE name = 'Vanguard Leather Backpack';

UPDATE public.products SET
  material = 'Premium full-grain vegetable-tanned Bangladeshi leather, solid brass hardware, organic cotton lining',
  dimensions = '10cm x 7.5cm x 0.6cm (Slim profile)'
WHERE name = 'Saddle Leather Wallet';

UPDATE public.products SET
  material = 'Surgical-grade 316L stainless steel, sapphire-coated crystal glass, genuine leather interchangeable strap',
  dimensions = 'Case Diameter: 40mm | Case Thickness: 7.2mm | Strap Width: 20mm'
WHERE name = 'Horology Minimalist Watch';

UPDATE public.products SET
  material = 'Anodized CNC aluminum top case, double-shot PBT keycaps, high-lubricity mechanical switches',
  dimensions = '315mm x 125mm x 38mm | Weight: 980g'
WHERE name = 'Tactile Mechanical Keyboard';

UPDATE public.products SET
  material = 'Double-walled borosilicate thermal glass, high-temperature glazed stoneware ceramic dripper',
  dimensions = 'Dripper: Size 02 (1-4 cups) | Server Capacity: 600ml'
WHERE name = 'Ceramic Coffee Dripper Set';

UPDATE public.products SET
  material = 'Solid C360 solid cartridge brass, polished satin finish, natural heavy anti-oxidation coating',
  dimensions = '140mm x 60mm x 55mm | Weight: 420g'
WHERE name = 'Solid Brass Desk Organizer';

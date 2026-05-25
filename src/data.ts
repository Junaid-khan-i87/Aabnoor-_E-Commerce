import { Product } from './types';

export const products: Product[] = [
  {
    id: 'p1',
    name: 'Luminous Hydration Serum',
    description: 'A deeply hydrating active serum that visibly plumps and illuminates.',
    price: 85.00,
    category: 'Skin Care',
    subCategory: 'Serums & Essentials',
    imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=800&auto=format&fit=crop',
    isNew: true,
    rating: 4.8,
    fullDetails: 'Engineered with a proprietary triple-weight molecular complex, this lightweight active serum penetrates deep into the epidermis to deliver unmatched hydration. It acts as a moisture magnet, locking in hydration to visibly fill fine lines, soothe redness, and restore natural skin luminosity.',
    ingredients: 'Aqua (Water), Glycerin, Niacinamide, Squalane, Hyaluronic Acid, Peptides Complex, Botanical Extract Blend',
    howToUse: 'Apply 3-4 drops to a clean, damp face and neck morning and evening. Gently press into the skin with smooth upward motions until fully absorbed. Follow with moisturizer.',
    advantages: [
      'Provides immediate and deep long-lasting hydration',
      'Visibly plumps fine lines and smooths rough skin texture',
      'Extremely lightweight, non-greasy, and fast-absorbing formula'
    ],
    disadvantages: [
      'Premium pricing point',
      'Glass bottle requires careful handling during travel'
    ],
    warnings: 'Avoid direct contact with eyes. In case of irritation, discontinue use immediately and consult a dermatologist. Patch test before use.',
    reviews: [
      { id: 'r1', user: 'Sarah M.', rating: 5, comment: 'Absolutely transformed my skin. It feels incredibly plump and glowing every morning.', date: new Date(Date.now() - 86400000 * 2).toISOString() },
      { id: 'r2', user: 'Jessica T.', rating: 4, comment: 'Great hydration, completely non-greasy. Just wish the bottle was larger.', date: new Date(Date.now() - 86400000 * 5).toISOString() }
    ],
    variants: [
      { name: '30ML / 1OZ', price: 85.00 },
      { name: '50ML / 1.7OZ', price: 125.00 }
    ]
  },
  {
    id: 'p2',
    name: 'Purifying Cleansing Balm',
    description: 'Everyday luxury cleansing balm. Clean beauty formula to reset and protect skin barrier.',
    price: 45.00,
    category: 'Skin Care',
    subCategory: 'Cleansers',
    imageUrl: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=800&auto=format&fit=crop',
    rating: 4.5,
    isFlashSale: true,
    flashSalePrice: 35.00,
    flashSaleEndTime: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(), // 12 hours from now
    fullDetails: 'An ultra-luxurious skin-softening balm that transforms from balm to milk, effortlessly melting away stubborn makeup, pollutants, SPF, and impurities. Infused with natural botanical oils, it respects and protects your natural lipid skin barrier, leaving skin pristine, comfortable, and hydrated.',
    ingredients: 'Caprylic/Capric Triglyceride, Sweet Almond Oil, Shea Butter, Sunflower Seed Wax, Chamomile Extract, Tocopherol',
    howToUse: 'Scoop a dime-sized amount and warm it between dry palms. Massage thoroughly over a dry face, paying close attention to makeup zones. Splash with warm water to emulsify into a light wash, then rinse completely.',
    advantages: [
      'Dissolves waterproof makeup and heavy SPF instantly',
      'Deeply cleanses without stripping skin hydration',
      'Leaves skin silky, soft, and completely residue-free'
    ],
    disadvantages: [
      'Must apply to dry hands and dry face first',
      'Melt sensitive if stored in direct high heat'
    ],
    warnings: 'Store in a cool, dry place. For external use only. Discontinue use if signs of inflammation occur.',
    reviews: [
      { id: 'r3', user: 'Emily R.', rating: 5, comment: 'The best cleanser I have ever used. Takes off all makeup without stripping.', date: new Date(Date.now() - 86400000 * 10).toISOString() }
    ]
  },
  {
    id: 'p3',
    name: 'Velvet Matte Iconic Rouge',
    description: 'A weightless, long-lasting iconic lipstick with intense pigment.',
    price: 38.00,
    category: 'Makeup',
    subCategory: 'Lip Care & Rouge',
    imageUrl: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?q=80&w=800&auto=format&fit=crop',
    isLimitedEdition: true,
    rating: 4.9,
    fullDetails: 'A beautiful, game-changing lipstick that strikes the ultimate balance between rich, high-fidelity matte pigmentation and sublime hydration. Formulated with spherical silica and nourishing hyaluronic microspheres, it glides across lips like butter for an airbrushed, velvet suede finish.',
    ingredients: 'Dimethicone, Synthetic Wax, Silica, Shea Butter, Hyaluronic spheres, Vitamin E, Red Pigment 7 Lake',
    howToUse: 'Glide directly onto bare lips from center outward, tracing natural lip lines, or use a fine brush for meticulous shape definition.',
    advantages: [
      'Saturated, intense single-stroke color payoff',
      'Comfortable and hydrating all-day matte wear',
      'Does not smudge, bleed, or settle into lip lines'
    ],
    disadvantages: [
      'Requires touch-ups after heavy oily meals',
      'Requires gentle bi-phase makeup remover to cleanse'
    ],
    warnings: 'Avoid swallowing. Keep away from extreme heat sources to prevent melting.',
    reviews: [
      { id: 'r4', user: 'Maria V.', rating: 5, comment: 'Stunning shade and the matte finish is super comfortable.', date: new Date(Date.now() - 86400000 * 1).toISOString() }
    ]
  },
  {
    id: 'p4',
    name: 'Gravity-Defying Mascara',
    description: 'High-performance mascara for unmatched volume and dramatic lift.',
    price: 32.00,
    category: 'Makeup',
    subCategory: 'Mascara & Eyes',
    imageUrl: 'https://images.unsplash.com/photo-1631214500515-e4a1f021966a?q=80&w=800&auto=format&fit=crop',
    isNew: true,
    rating: 4.2,
    fullDetails: 'Give your eyelashes supreme extension with this smudge-proof, clump-free formula. Formulated with bamboo fiber extract and flexible polymers, it wraps each eyelash individually, lifting them to gravity-defying heights while thickening volume instantly without heavy, drooping weight.',
    ingredients: 'Aqua, Beeswax, Carnauba Wax, Stearic Acid, Glyceryl Stearate, Bamboo Fiber, Iron Oxides (CI 77499)',
    howToUse: 'Wiggle the brush from the root of lashes upwards in gentle zig-zag strokes. Layer up to three times consecutively for intense, night-out dramatic volume.',
    advantages: [
      'Gives intense, long-lasting vertical lash lift',
      'Flake-proof, wax-based daily comfort',
      'Builds massive volume without clumping'
    ],
    disadvantages: [
      'Requires double cleansing or oil cleanser to remove',
      'Dries relatively quickly during brush application'
    ],
    warnings: 'To preserve formulation safety, do not pump brush in tube. Avoid direct contact with eyeball. If contact occurs, rinse immediately with water.'
  },
  {
    id: 'p5',
    name: 'Silk Revive Hair Oil',
    description: 'Nourishing botanical hair care favorite for effortless shine.',
    price: 65.00,
    category: 'Hair Care',
    subCategory: 'Treatment Oils',
    imageUrl: 'https://images.unsplash.com/photo-1626509653294-0cfd911b3341?q=80&w=800&auto=format&fit=crop',
    rating: 4.6,
    isFlashSale: true,
    flashSalePrice: 48.00,
    flashSaleEndTime: new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString(), // 5 hours from now
    fullDetails: 'Formulated with cold-pressed botanical extracts and lightweight silk proteins, this premium hair treatment tames stubborn frizz, heals damaged cuticles, and restores luminous light reflection to hair fibers. Protects hair against thermal styling tools and dynamic pollutants.',
    ingredients: 'Cyclopentasiloxane, Argania Spinosa Kernel Oil, Camellia Seed Oil, Silk Amino Acids, Hydrolyzed Keratin, Linalool',
    howToUse: 'Dispense 1-2 pumps onto palms. Rub together and smooth through damp or dry hair lengths and tips, avoiding scalp. Use pre-styling or as a post-blowout perfector.',
    advantages: [
      'Provides high, radiant shine and locks out humidity',
      'Heals split ends and protects against styling heat up to 230°C',
      'Ultra-light fluid doesn\'t weigh down finer hair types'
    ],
    disadvantages: [
      'Avoid on oily scalps',
      'Over-application can leave hair looking wet'
    ],
    warnings: 'For external use only. Keep out of reach of children. Flammable—keep away from open flames or high thermal sources.',
    reviews: [
      { id: 'r5', user: 'Chloe L.', rating: 4, comment: 'Smells divine. Leaves my hair super soft.', date: new Date(Date.now() - 86400000 * 15).toISOString() }
    ]
  },
  {
    id: 'p6',
    name: 'Oud & Bergamot Phantom',
    description: 'An enigmatic, futuristic fragrance with dark wood and citrus notes.',
    price: 140.00,
    category: 'Fragrance',
    subCategory: 'Parfums',
    imageUrl: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=800&auto=format&fit=crop',
    isLimitedEdition: true,
    rating: 5.0,
    fullDetails: 'An avant-garde fragrance designed for the modern non-conformist. It opens with striking, refreshing top notes of Calabrian bergamot and spicy black pepper, melting into a dark heart of precious agarwood (oud), vetiver, and smoky cedarwood, anchored by black amber and raw leather.',
    ingredients: 'Alcohol Denat., Fragrance (Parfum), Calabrian Bergamot oil, Agarwood Oil, Limonene, Linalool, Coumarin',
    howToUse: 'Spritz on active pulse points—such as wrists, neck, and inner elbows. Do not rub skin together after application to allow fragrance dry-down to evolve naturally.',
    advantages: [
      'Striking, complex, and sophisticated unisex scent projection',
      'Extremely long-lasting parfum concentration (8+ hours)',
      'Sublime, premium heavy-weight matte glass presentation'
    ],
    disadvantages: [
      'Oud formulation may be too rich for mid-summer daywear',
      'Highly premium pricing tier'
    ],
    warnings: 'Flammable. Do not spray near open ignition flame or hot elements. Avoid contact with eyes or dry, broken, irritated skin.',
    variants: [
      { name: '50ML', price: 140.00 },
      { name: '100ML', price: 210.00 }
    ],
    reviews: [
      { id: 'r6', user: 'Oliver S.', rating: 5, comment: 'My new signature scent. Always get compliments on it.', date: new Date(Date.now() - 86400000 * 30).toISOString() }
    ]
  },
  {
    id: 'p7',
    name: 'Cellular Renewal Cream',
    description: 'Skin care essentials: Night cream for ultimate age-defending hydration.',
    price: 110.00,
    category: 'Skin Care',
    subCategory: 'Night Creams',
    imageUrl: 'https://images.unsplash.com/photo-1615397323862-520ab4ca3bfb?q=80&w=800&auto=format&fit=crop',
    rating: 4.7,
    fullDetails: 'An ultra-nourishing, rich night moisturizer packed with encapsulated retinol, essential ceramides, and fermented yeast extracts. It works in harmony with the skin\'s natural nocturnal repair cycle to rebuild collagens, restore barrier elasticity, and smooth away irregular spots.',
    ingredients: 'Water, Caprylic/Capric Triglyceride, Retinol (Encapsulated), Ceramide NP, Ceramide AP, Squalane, Yeast Ferment Lysate, Allantoin',
    howToUse: 'Smooth a pea-sized layer over pre-cleansed skin at night, after applying active serums. Begin 2-3 nights per week to build tolerance, then increase frequency.',
    advantages: [
      'Significantly speeds skin turnover and collagen production',
      'Plumps skin cellular matrices and restores resilience',
      'Contains soothing ceramides to counteract retinol micro-flaking'
    ],
    disadvantages: [
      'Retinol formulation is inappropriate for daytime exposure',
      'Cannot be used concurrently with strong AHA exfoliators'
    ],
    warnings: 'Apply a broad-spectrum high SPF sunscreen daily. Discontinue during pregnancy/lactation. A mild warmth or skin flaking is typical inside the initial two weeks.'
  },
  {
    id: 'p8',
    name: 'Lumière Setting Powder',
    description: 'Makeup staples: Ultra-fine powder for an airbrushed, zero-shine finish.',
    price: 42.00,
    category: 'Makeup',
    subCategory: 'Setting Powders',
    imageUrl: 'https://images.unsplash.com/photo-1590156546946-ce55a12a6a5d?q=80&w=800&auto=format&fit=crop',
    rating: 4.4,
    fullDetails: 'This feather-light, micro-milled loose powder locks makeup in place for up to 16 hours of pristine shine control. Infused with hydrating amino acids and light-refracting minerals, it blurs skin imperfections, pores, and fine lines without any cakey buildup or flash-back photos.',
    ingredients: 'Talc (Asbestos-Free), Synthetic Fluorphlogopite, Zinc Stearate, Amino Acids Complex, Mica, Iron Oxide (CI 77491)',
    howToUse: 'Saturate a velour powder puff or fluffy brush, tap off excess product from fibers, and gently press across shine-prone areas such as the T-zone.',
    advantages: [
      'Ultra-fine, breathable, weightless setting',
      'Gives a flawless, blurred matte finish under high-definition cameras',
      'Zeros out flash photos flashback white-cast completely'
    ],
    disadvantages: [
      'Loose powder format requires solid care to prevent baggage spills',
      'Powder puff applicators must be washed routinely'
    ],
    warnings: 'Avoid intentional dust inhalation. Close lid tightly after use.'
  }
];

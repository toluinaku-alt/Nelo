import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Nelo Nigerian Delivery Platform Seed...");

  // 1. Setup Ledger Accounts
  console.log("Initializing Double-Entry Ledger Accounts...");
  const ledgerAccounts = [
    { code: "CUSTOMER_WALLET", name: "Customer Inbound Clearing / Wallet" },
    { code: "ESCROW_GOODS", name: "Shop-for-Me Goods Escrow Clearing" },
    { code: "VENDOR_PAYABLE", name: "Vendor Settlement Payable" },
    { code: "RIDER_PAYABLE", name: "Rider Earnings Payable" },
    { code: "PLATFORM_FEES", name: "Nelo Platform Commission & Service Revenue" },
    { code: "REFUND_CLEARING", name: "Customer Refund Clearing" },
  ];

  for (const acc of ledgerAccounts) {
    await prisma.ledgerAccount.upsert({
      where: { code: acc.code },
      update: {},
      create: {
        code: acc.code,
        name: acc.name,
        balanceKobo: 0,
      },
    });
  }

  // 2. Setup Service Zones
  console.log("Creating Nigerian Service Zones...");
  const zoneLagosIsland = await prisma.serviceZone.upsert({
    where: { id: "zone-lagos-island" },
    update: {},
    create: {
      id: "zone-lagos-island",
      name: "Lagos Island (VI, Ikoyi, Lekki)",
      state: "Lagos",
      baseFareKobo: 120000, // ₦1,200
      perKmRateKobo: 15000, // ₦150/km
      surgeMultiplier: 1.0,
      maxPackageWeightKg: 25.0,
    },
  });

  const zoneLagosMainland = await prisma.serviceZone.upsert({
    where: { id: "zone-lagos-mainland" },
    update: {},
    create: {
      id: "zone-lagos-mainland",
      name: "Lagos Mainland (Ikeja, Yaba, Surulere)",
      state: "Lagos",
      baseFareKobo: 100000, // ₦1,000
      perKmRateKobo: 14000, // ₦140/km
      surgeMultiplier: 1.0,
      maxPackageWeightKg: 25.0,
    },
  });

  const zoneAbuja = await prisma.serviceZone.upsert({
    where: { id: "zone-abuja-central" },
    update: {},
    create: {
      id: "zone-abuja-central",
      name: "Abuja Central (Wuse, Maitama, Garki)",
      state: "Abuja FCT",
      baseFareKobo: 150000, // ₦1,500
      perKmRateKobo: 18000, // ₦180/km
      surgeMultiplier: 1.0,
      maxPackageWeightKg: 30.0,
    },
  });

  // 3. Setup Users across all 7 Roles
  console.log("Creating Users for all 7 Personas...");

  // Customer
  const customerUser = await prisma.user.upsert({
    where: { email: "chioma@nelo.ng" },
    update: {},
    create: {
      id: "user-cust-chioma",
      email: "chioma@nelo.ng",
      fullName: "Chioma Adeleke",
      phone: "+2348021234567",
      role: "CUSTOMER",
    },
  });

  await prisma.customerAddress.upsert({
    where: { id: "addr-chioma-home" },
    update: {},
    create: {
      id: "addr-chioma-home",
      userId: customerUser.id,
      label: "Home (Lekki Phase 1)",
      streetAddress: "14 Admiralty Way, Lekki Phase 1",
      city: "Lagos",
      state: "Lagos State",
      latitude: 6.4474,
      longitude: 3.4735,
      deliveryInstructions: "Call gate security when you arrive.",
      isDefault: true,
    },
  });

  await prisma.customerAddress.upsert({
    where: { id: "addr-chioma-office" },
    update: {},
    create: {
      id: "addr-chioma-office",
      userId: customerUser.id,
      label: "Office (Victoria Island)",
      streetAddress: "Plot 12A Karimu Kotun, Victoria Island",
      city: "Lagos",
      state: "Lagos State",
      latitude: 6.4281,
      longitude: 3.4219,
      deliveryInstructions: "Leave with front desk reception on 3rd floor.",
      isDefault: false,
    },
  });

  // Vendor 1 Owner
  const vendorUserYellowChilli = await prisma.user.upsert({
    where: { email: "babatunde@yellowchilli.ng" },
    update: {},
    create: {
      id: "user-vendor-babatunde",
      email: "babatunde@yellowchilli.ng",
      fullName: "Chef Babatunde Awolowo",
      phone: "+2348032345678",
      role: "VENDOR_OWNER",
    },
  });

  // Vendor 2 Staff
  const vendorUserFreshMart = await prisma.user.upsert({
    where: { email: "amina@freshmart.ng" },
    update: {},
    create: {
      id: "user-vendor-amina",
      email: "amina@freshmart.ng",
      fullName: "Amina Bello",
      phone: "+2348053456789",
      role: "VENDOR_STAFF",
    },
  });

  // Rider 1 (Freelance Motorcycle)
  const riderUserEmeka = await prisma.user.upsert({
    where: { email: "emeka.rider@nelo.ng" },
    update: {},
    create: {
      id: "user-rider-emeka",
      email: "emeka.rider@nelo.ng",
      fullName: "Emeka Obi",
      phone: "+2348074567890",
      role: "RIDER",
    },
  });

  const riderProfileEmeka = await prisma.riderProfile.upsert({
    where: { userId: riderUserEmeka.id },
    update: {},
    create: {
      id: "rider-emeka-profile",
      userId: riderUserEmeka.id,
      employmentType: "FREELANCE",
      vehicleType: "MOTORCYCLE",
      plateNumber: "KJA-829-XP",
      isVerified: true,
      isOnline: true,
      currentLat: 6.442,
      currentLng: 3.461,
      rating: 4.9,
      totalDeliveries: 342,
      walletBalanceKobo: 4850000, // ₦48,500
      activeZoneId: zoneLagosIsland.id,
    },
  });

  // Rider 2 (Company-employed Motorcycle)
  const riderUserTunde = await prisma.user.upsert({
    where: { email: "tunde.rider@nelo.ng" },
    update: {},
    create: {
      id: "user-rider-tunde",
      email: "tunde.rider@nelo.ng",
      fullName: "Tunde Bakare",
      phone: "+2348095678901",
      role: "RIDER",
    },
  });

  await prisma.riderProfile.upsert({
    where: { userId: riderUserTunde.id },
    update: {},
    create: {
      id: "rider-tunde-profile",
      userId: riderUserTunde.id,
      employmentType: "COMPANY_EMPLOYED",
      vehicleType: "MOTORCYCLE",
      plateNumber: "EKY-414-AB",
      isVerified: true,
      isOnline: true,
      currentLat: 6.591,
      currentLng: 3.352,
      rating: 4.8,
      totalDeliveries: 189,
      walletBalanceKobo: 2200000, // ₦22,000
      activeZoneId: zoneLagosMainland.id,
    },
  });

  // Ops Dispatcher
  const dispatcherUser = await prisma.user.upsert({
    where: { email: "folake.dispatch@nelo.ng" },
    update: {},
    create: {
      id: "user-staff-folake",
      email: "folake.dispatch@nelo.ng",
      fullName: "Folake Daniels",
      phone: "+2348116789012",
      role: "DISPATCHER",
    },
  });

  // Finance Operator
  const financeUser = await prisma.user.upsert({
    where: { email: "ngozi.finance@nelo.ng" },
    update: {},
    create: {
      id: "user-staff-ngozi",
      email: "ngozi.finance@nelo.ng",
      fullName: "Ngozi Eze",
      phone: "+2348137890123",
      role: "FINANCE_OPERATOR",
    },
  });

  // Support Agent
  const supportUser = await prisma.user.upsert({
    where: { email: "ibrahim.support@nelo.ng" },
    update: {},
    create: {
      id: "user-staff-ibrahim",
      email: "ibrahim.support@nelo.ng",
      fullName: "Ibrahim Musa",
      phone: "+2348158901234",
      role: "SUPPORT_AGENT",
    },
  });

  // Admin
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@nelo.ng" },
    update: {},
    create: {
      id: "user-admin-kola",
      email: "admin@nelo.ng",
      fullName: "Kolawole Johnson",
      phone: "+2348179012345",
      role: "ADMIN",
    },
  });

  // 4. Vendors and Menus
  console.log("Creating Verified Vendors & Catalogs...");

  // Vendor 1: Yellow Chilli
  const vendorYellowChilli = await prisma.vendor.upsert({
    where: { slug: "yellow-chilli-vi" },
    update: {},
    create: {
      id: "vendor-yellow-chilli",
      name: "Yellow Chilli Restaurant & Bar",
      slug: "yellow-chilli-vi",
      description: "Iconic gourmet Nigerian dining — authentic Jollof, spicy seafood, and tender peppered delicacies.",
      category: "FOOD",
      streetAddress: "27 Oju Olobun Close, Off Bishop Oluwole, Victoria Island",
      city: "Lagos",
      state: "Lagos State",
      latitude: 6.4298,
      longitude: 3.4243,
      zoneId: zoneLagosIsland.id,
      isVerified: true,
      isOpen: true,
      rating: 4.9,
      prepTimeMinutes: 25,
      commissionPercent: 12.5,
    },
  });

  await prisma.vendorStaff.upsert({
    where: { vendorId_userId: { vendorId: vendorYellowChilli.id, userId: vendorUserYellowChilli.id } },
    update: {},
    create: {
      vendorId: vendorYellowChilli.id,
      userId: vendorUserYellowChilli.id,
      role: "OWNER",
    },
  });

  const catMains = await prisma.catalogCategory.upsert({
    where: { id: "cat-yc-mains" },
    update: {},
    create: {
      id: "cat-yc-mains",
      vendorId: vendorYellowChilli.id,
      name: "Chef's Signature Mains",
      sortOrder: 1,
    },
  });

  const catSides = await prisma.catalogCategory.upsert({
    where: { id: "cat-yc-sides" },
    update: {},
    create: {
      id: "cat-yc-sides",
      vendorId: vendorYellowChilli.id,
      name: "Sides & Beverages",
      sortOrder: 2,
    },
  });

  const itemJollof = await prisma.catalogItem.upsert({
    where: { id: "item-yc-jollof" },
    update: {},
    create: {
      id: "item-yc-jollof",
      vendorId: vendorYellowChilli.id,
      categoryId: catMains.id,
      name: "Signature Smoky Jollof Rice with Spicy Asun",
      description: "Firewood-style party Jollof served with tender peppered goat meat and fried plantain slices.",
      priceKobo: 420000, // ₦4,200
      isAvailable: true,
      preparationTimeMinutes: 20,
    },
  });

  const itemSeafood = await prisma.catalogItem.upsert({
    where: { id: "item-yc-seafood" },
    update: {},
    create: {
      id: "item-yc-seafood",
      vendorId: vendorYellowChilli.id,
      categoryId: catMains.id,
      name: "Gourmet Seafood Okro with Poundo",
      description: "Jumbo tiger prawns, calamari, and fresh fish in aromatic traditional herbs and pounded yam.",
      priceKobo: 650000, // ₦6,500
      isAvailable: true,
      preparationTimeMinutes: 25,
    },
  });

  const itemPlantain = await prisma.catalogItem.upsert({
    where: { id: "item-yc-dodo" },
    update: {},
    create: {
      id: "item-yc-dodo",
      vendorId: vendorYellowChilli.id,
      categoryId: catSides.id,
      name: "Golden Fried Sweet Plantain (Dodo)",
      description: "Ripe plantains diced and deep-fried to caramelized perfection.",
      priceKobo: 120000, // ₦1,200
      isAvailable: true,
      preparationTimeMinutes: 10,
    },
  });

  const itemZobo = await prisma.catalogItem.upsert({
    where: { id: "item-yc-zobo" },
    update: {},
    create: {
      id: "item-yc-zobo",
      vendorId: vendorYellowChilli.id,
      categoryId: catSides.id,
      name: "Fresh Chilled Zobo Infusion (500ml)",
      description: "Hibiscus calyces brewed with ginger, cloves, and natural pineapple extracts.",
      priceKobo: 150000, // ₦1,500
      isAvailable: true,
      preparationTimeMinutes: 5,
    },
  });

  // Vendor 2: FreshMart Supermarket
  const vendorFreshMart = await prisma.vendor.upsert({
    where: { slug: "freshmart-lekki" },
    update: {},
    create: {
      id: "vendor-freshmart",
      name: "FreshMart Groceries & Essentials",
      slug: "freshmart-lekki",
      description: "Farm-fresh peppers, organic produce, bulk pantry items, and imported household goods.",
      category: "GROCERY",
      streetAddress: "Block 8, Bisola Durosinmi Etti Drive, Lekki Phase 1",
      city: "Lagos",
      state: "Lagos State",
      latitude: 6.4485,
      longitude: 3.4751,
      zoneId: zoneLagosIsland.id,
      isVerified: true,
      isOpen: true,
      rating: 4.7,
      prepTimeMinutes: 15,
      commissionPercent: 10.0,
    },
  });

  await prisma.vendorStaff.upsert({
    where: { vendorId_userId: { vendorId: vendorFreshMart.id, userId: vendorUserFreshMart.id } },
    update: {},
    create: {
      vendorId: vendorFreshMart.id,
      userId: vendorUserFreshMart.id,
      role: "MANAGER",
    },
  });

  const catPantry = await prisma.catalogCategory.upsert({
    where: { id: "cat-fm-pantry" },
    update: {},
    create: {
      id: "cat-fm-pantry",
      vendorId: vendorFreshMart.id,
      name: "Pantry & Staple Foods",
      sortOrder: 1,
    },
  });

  const catProduce = await prisma.catalogCategory.upsert({
    where: { id: "cat-fm-produce" },
    update: {},
    create: {
      id: "cat-fm-produce",
      vendorId: vendorFreshMart.id,
      name: "Fresh Produce & Market Veggies",
      sortOrder: 2,
    },
  });

  await prisma.catalogItem.upsert({
    where: { id: "item-fm-rice" },
    update: {},
    create: {
      id: "item-fm-rice",
      vendorId: vendorFreshMart.id,
      categoryId: catPantry.id,
      name: "Mama Gold Parboiled Rice (10kg)",
      description: "Premium stone-free Nigerian parboiled long grain rice.",
      priceKobo: 1650000, // ₦16,500
      isAvailable: true,
      preparationTimeMinutes: 10,
    },
  });

  await prisma.catalogItem.upsert({
    where: { id: "item-fm-tomatoes" },
    update: {},
    create: {
      id: "item-fm-tomatoes",
      vendorId: vendorFreshMart.id,
      categoryId: catProduce.id,
      name: "Fresh Jos Roma Tomatoes Basket (5kg)",
      description: "Firm, sun-ripened tomatoes fresh from Plateau state farmers.",
      priceKobo: 750000, // ₦7,500
      isAvailable: true,
      preparationTimeMinutes: 10,
    },
  });

  await prisma.catalogItem.upsert({
    where: { id: "item-fm-pepper" },
    update: {},
    create: {
      id: "item-fm-pepper",
      vendorId: vendorFreshMart.id,
      categoryId: catProduce.id,
      name: "Ata Rodo / Scotch Bonnet Pepper Pack (1kg)",
      description: "Spicy, aromatic fresh red scotch bonnet peppers.",
      priceKobo: 280000, // ₦2,800
      isAvailable: true,
      preparationTimeMinutes: 10,
    },
  });

  // Vendor 3: Suya Spot Abuja
  const vendorSuya = await prisma.vendor.upsert({
    where: { slug: "suya-spot-abuja" },
    update: {},
    create: {
      id: "vendor-suya-abuja",
      name: "Suya Spot Central Grill",
      slug: "suya-spot-abuja",
      description: "Northern Nigerian open-flame grilled beef and chicken suya seasoned with authentic Yaji spice.",
      category: "FOOD",
      streetAddress: "Aminu Kano Crescent, Wuse 2",
      city: "Abuja",
      state: "Abuja FCT",
      latitude: 9.0765,
      longitude: 7.4721,
      zoneId: zoneAbuja.id,
      isVerified: true,
      isOpen: true,
      rating: 4.8,
      prepTimeMinutes: 20,
      commissionPercent: 12.0,
    },
  });

  const catSuya = await prisma.catalogCategory.upsert({
    where: { id: "cat-suya-grill" },
    update: {},
    create: {
      id: "cat-suya-grill",
      vendorId: vendorSuya.id,
      name: "Charcoal Grills",
      sortOrder: 1,
    },
  });

  await prisma.catalogItem.upsert({
    where: { id: "item-suya-beef" },
    update: {},
    create: {
      id: "item-suya-beef",
      vendorId: vendorSuya.id,
      categoryId: catSuya.id,
      name: "Prime Beef Suya Platter with Sliced Onions",
      description: "Charcoal grilled tender beef strips tossed in roasted peanut yaji spice.",
      priceKobo: 350000, // ₦3,500
      isAvailable: true,
      preparationTimeMinutes: 15,
    },
  });

  // 5. Create Sample Orders for Demonstration
  console.log("Creating Seed Orders for Demonstration across all 3 services...");

  // A. Live Marketplace Order
  const orderMk1 = await prisma.order.upsert({
    where: { orderNumber: "NELO-MK-2041" },
    update: {},
    create: {
      id: "order-seed-mk-1",
      orderNumber: "NELO-MK-2041",
      customerId: customerUser.id,
      serviceType: "MARKETPLACE",
      status: "PLACED",
      zoneId: zoneLagosIsland.id,
      vendorId: vendorYellowChilli.id,
      subtotalKobo: 540000, // ₦5,400 (Jollof + Dodo)
      deliveryFeeKobo: 150000, // ₦1,500
      serviceFeeKobo: 30000, // ₦300
      totalAmountKobo: 720000, // ₦7,200
      pickupAddressJson: JSON.stringify({
        name: vendorYellowChilli.name,
        address: vendorYellowChilli.streetAddress,
        latitude: vendorYellowChilli.latitude,
        longitude: vendorYellowChilli.longitude,
      }),
      dropoffAddressJson: JSON.stringify({
        label: "Home (Lekki Phase 1)",
        streetAddress: "14 Admiralty Way, Lekki Phase 1",
        city: "Lagos",
        latitude: 6.4474,
        longitude: 3.4735,
      }),
      marketplaceDetails: {
        create: {
          vendorInstructions: "Please make the Asun medium spicy, no extra oil.",
          cutleryIncluded: true,
        },
      },
      items: {
        create: [
          {
            catalogItemId: itemJollof.id,
            nameSnapshot: itemJollof.name,
            priceKoboSnapshot: itemJollof.priceKobo,
            quantity: 1,
          },
          {
            catalogItemId: itemPlantain.id,
            nameSnapshot: itemPlantain.name,
            priceKoboSnapshot: itemPlantain.priceKobo,
            quantity: 1,
          },
        ],
      },
      payment: {
        create: {
          amountKobo: 720000,
          channel: "CARD",
          status: "SUCCESS",
          provider: "MOCK_PAYSTACK",
          providerRef: "MOCK-TX-MK2041",
          paidAt: new Date(),
        },
      },
      delivery: {
        create: {
          distanceKm: 4.8,
          estimatedDurationMinutes: 30,
          riderEarningsKobo: 120000,
          status: "PENDING_DISPATCH",
        },
      },
      events: {
        create: {
          eventType: "ORDER_PLACED",
          actorId: customerUser.id,
          actorRole: "CUSTOMER",
          metadataJson: JSON.stringify({ note: "Order placed via Nelo Web App" }),
        },
      },
    },
  });

  // B. Live Shop for Me Order (Balogun Market Concierge)
  const orderSfm1 = await prisma.order.upsert({
    where: { orderNumber: "NELO-SFM-8832" },
    update: {},
    create: {
      id: "order-seed-sfm-1",
      orderNumber: "NELO-SFM-8832",
      customerId: customerUser.id,
      serviceType: "SHOP_FOR_ME",
      status: "AWAITING_RIDER",
      zoneId: zoneLagosIsland.id,
      subtotalKobo: 3500000, // ₦35,000 Goods Budget
      deliveryFeeKobo: 200000, // ₦2,000
      serviceFeeKobo: 150000, // ₦1,500 concierge fee
      totalAmountKobo: 3850000, // ₦38,500
      pickupAddressJson: JSON.stringify({
        name: "Balogun Market (Fabric & Dry Goods Stalls)",
        address: "Lagos Island Central Market, Stall 42B",
        latitude: 6.4578,
        longitude: 3.3855,
      }),
      dropoffAddressJson: JSON.stringify({
        label: "Home (Lekki Phase 1)",
        streetAddress: "14 Admiralty Way, Lekki Phase 1",
        city: "Lagos",
        latitude: 6.4474,
        longitude: 3.4735,
      }),
      shopForMeDetails: {
        create: {
          shopName: "Balogun Market - Mama Nkechi Fabric & Spices",
          shopAddress: "Lagos Island Market, Block 4, Stall 18",
          goodsBudgetKobo: 3500000, // ₦35,000
          spendingLimitKobo: 4000000, // ₦40,000
          substitutionPreference: "CALL_CUSTOMER",
          notes: "Please ask for original Hollandis wax fabric (Royal Blue) and 2 mudu of dried Oron crayfish.",
          items: {
            create: [
              {
                itemName: "Hollandis Wax 6-Yards (Royal Blue pattern)",
                quantity: 1,
                unit: "bundle",
                estimatedPriceKobo: 2800000, // ₦28,000
              },
              {
                itemName: "Dried Oron Crayfish (Cleaned)",
                quantity: 2,
                unit: "mudu",
                estimatedPriceKobo: 700000, // ₦7,000
              },
            ],
          },
        },
      },
      payment: {
        create: {
          amountKobo: 3850000,
          channel: "CARD",
          status: "SUCCESS",
          provider: "MOCK_PAYSTACK",
          providerRef: "MOCK-TX-SFM8832",
          paidAt: new Date(),
        },
      },
      delivery: {
        create: {
          distanceKm: 8.5,
          estimatedDurationMinutes: 50,
          riderEarningsKobo: 250000, // ₦2,500 earnings
          status: "OFFERED",
        },
      },
      events: {
        create: {
          eventType: "ORDER_PLACED",
          actorId: customerUser.id,
          actorRole: "CUSTOMER",
          metadataJson: JSON.stringify({ service: "SHOP_FOR_ME" }),
        },
      },
    },
    include: { delivery: true },
  });

  // Create an active dispatch offer to Emeka for the Shop for Me order so it's immediately testable!
  if (orderSfm1.delivery) {
    await prisma.dispatchOffer.upsert({
      where: { id: "offer-sfm-emeka" },
      update: {},
      create: {
        id: "offer-sfm-emeka",
        deliveryId: orderSfm1.delivery.id,
        riderId: riderProfileEmeka.id,
        status: "OFFERED",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins left
        estimatedEarningsKobo: 250000,
      },
    });
  }

  // C. Live Package Courier Order (Security PIN protected)
  const orderPkg1 = await prisma.order.upsert({
    where: { orderNumber: "NELO-PKG-5192" },
    update: {},
    create: {
      id: "order-seed-pkg-1",
      orderNumber: "NELO-PKG-5192",
      customerId: customerUser.id,
      serviceType: "PACKAGE",
      status: "ASSIGNED",
      zoneId: zoneLagosIsland.id,
      deliveryFeeKobo: 240000, // ₦2,400
      serviceFeeKobo: 20000, // ₦200
      totalAmountKobo: 260000, // ₦2,600
      pickupAddressJson: JSON.stringify({
        label: "Office (Victoria Island)",
        streetAddress: "Plot 12A Karimu Kotun, Victoria Island",
        city: "Lagos",
        contactName: "Chioma Adeleke",
        contactPhone: "+2348021234567",
        latitude: 6.4281,
        longitude: 3.4219,
      }),
      dropoffAddressJson: JSON.stringify({
        label: "Law Chambers (Ikeja GRA)",
        streetAddress: "22 Isaac John Street, Ikeja GRA",
        city: "Lagos",
        contactName: "Barrister Seyi Alabi",
        contactPhone: "+2348039988776",
        latitude: 6.5901,
        longitude: 3.3515,
      }),
      packageDetails: {
        create: {
          packageCategory: "DOCUMENTS",
          weightKg: 1.2,
          dimensionsCm: "35x25x5",
          recipientName: "Barrister Seyi Alabi",
          recipientPhone: "+2348039988776",
          isFragile: false,
          securityPin: "7429", // 4-digit drop-off verification PIN!
          deliveryInstructions: "Confidential property contracts. Only hand over upon PIN confirmation.",
        },
      },
      payment: {
        create: {
          amountKobo: 260000,
          channel: "BANK_TRANSFER",
          status: "SUCCESS",
          provider: "MOCK_PAYSTACK",
          providerRef: "MOCK-TX-PKG5192",
          paidAt: new Date(),
        },
      },
      delivery: {
        create: {
          riderId: riderProfileEmeka.id,
          distanceKm: 18.2,
          estimatedDurationMinutes: 45,
          riderEarningsKobo: 200000,
          status: "ACCEPTED",
          proofType: "PIN_AND_PHOTO",
        },
      },
      events: {
        create: {
          eventType: "RIDER_ASSIGNED",
          actorId: riderUserEmeka.id,
          actorRole: "RIDER",
          metadataJson: JSON.stringify({ riderName: "Emeka Obi", vehicle: "Motorcycle" }),
        },
      },
    },
  });

  // D. Completed Delivered Order (with double-entry financial ledger records)
  const orderDelivered = await prisma.order.upsert({
    where: { orderNumber: "NELO-MK-1008" },
    update: {},
    create: {
      id: "order-seed-delivered",
      orderNumber: "NELO-MK-1008",
      customerId: customerUser.id,
      serviceType: "MARKETPLACE",
      status: "DELIVERED",
      zoneId: zoneLagosIsland.id,
      vendorId: vendorYellowChilli.id,
      subtotalKobo: 650000,
      deliveryFeeKobo: 150000,
      serviceFeeKobo: 30000,
      totalAmountKobo: 830000,
      pickupAddressJson: JSON.stringify({
        name: vendorYellowChilli.name,
        address: vendorYellowChilli.streetAddress,
        latitude: vendorYellowChilli.latitude,
        longitude: vendorYellowChilli.longitude,
      }),
      dropoffAddressJson: JSON.stringify({
        label: "Office (Victoria Island)",
        streetAddress: "Plot 12A Karimu Kotun, Victoria Island",
        city: "Lagos",
        latitude: 6.4281,
        longitude: 3.4219,
      }),
      items: {
        create: [
          {
            catalogItemId: itemSeafood.id,
            nameSnapshot: itemSeafood.name,
            priceKoboSnapshot: itemSeafood.priceKobo,
            quantity: 1,
          },
        ],
      },
      payment: {
        create: {
          amountKobo: 830000,
          status: "SUCCESS",
          channel: "CARD",
          provider: "MOCK_PAYSTACK",
          providerRef: "MOCK-TX-DELIV1008",
          paidAt: new Date(Date.now() - 3600000),
        },
      },
      delivery: {
        create: {
          riderId: riderProfileEmeka.id,
          status: "DELIVERED",
          distanceKm: 3.2,
          estimatedDurationMinutes: 20,
          riderEarningsKobo: 120000,
          pickupTime: new Date(Date.now() - 2400000),
          deliveryTime: new Date(Date.now() - 600000),
          proofNotes: "Delivered directly to customer at 3rd floor reception.",
        },
      },
    },
  });

  // Record Ledger entries for the completed order
  const accCust = await prisma.ledgerAccount.findUnique({ where: { code: "CUSTOMER_WALLET" } });
  const accVendor = await prisma.ledgerAccount.findUnique({ where: { code: "VENDOR_PAYABLE" } });
  const accRider = await prisma.ledgerAccount.findUnique({ where: { code: "RIDER_PAYABLE" } });
  const accPlatform = await prisma.ledgerAccount.findUnique({ where: { code: "PLATFORM_FEES" } });

  if (accCust && accVendor && accRider && accPlatform) {
    // 1. Customer Payment -> Vendor Payable
    await prisma.ledgerEntry.create({
      data: {
        orderId: orderDelivered.id,
        debitAccountId: accCust.id,
        creditAccountId: accVendor.id,
        amountKobo: 650000,
        description: "Order NELO-MK-1008: Food payment credited to Yellow Chilli",
        referenceType: "ORDER_PAYMENT",
      },
    });

    // 2. Customer Payment -> Platform Fees
    await prisma.ledgerEntry.create({
      data: {
        orderId: orderDelivered.id,
        debitAccountId: accCust.id,
        creditAccountId: accPlatform.id,
        amountKobo: 180000,
        description: "Order NELO-MK-1008: Service fee & delivery revenue",
        referenceType: "PLATFORM_COMMISSION",
      },
    });

    // 3. Platform -> Rider Payout
    await prisma.ledgerEntry.create({
      data: {
        orderId: orderDelivered.id,
        debitAccountId: accPlatform.id,
        creditAccountId: accRider.id,
        amountKobo: 120000,
        description: "Order NELO-MK-1008: Delivery fee payout to Rider Emeka Obi",
        referenceType: "RIDER_EARNING",
      },
    });
  }

  // 6. Sample Audit Log for Operations
  console.log("Creating Sample Ops Audit Logs...");
  await prisma.auditLog.create({
    data: {
      userId: dispatcherUser.id,
      userRole: "DISPATCHER",
      action: "ORDER_REASSIGN",
      targetResource: "Delivery",
      targetId: "delivery-init-sample",
      reason: "Initial rider experienced flat tyre on Third Mainland Bridge, reassigned for SLA compliance.",
      metadataJson: JSON.stringify({ previousRider: "Rider #102", newRider: "Emeka Obi" }),
    },
  });

  console.log("✅ Nelo Seed Completed Successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

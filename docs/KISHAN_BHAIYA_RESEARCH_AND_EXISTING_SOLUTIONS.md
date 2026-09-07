# KISHAN BHAIYA — Research, References, and Existing-Solution Landscape

**Research date:** 5 September 2026  
**Geographic focus:** Odisha, with India-wide comparisons  
**Product scope:** Farm-output marketplace, direct retail, B2B procurement, FPO aggregation, lot traceability, pre-harvest demand, surplus rescue, multi-seller fulfilment, and agricultural logistics

## 1. Executive summary

KISHAN BHAIYA addresses a real but already active problem space. India has public systems for mandi trading, market prices, logistics discovery, MSP procurement, and open digital commerce; it also has private companies focused on fresh-produce supply chains, B2B trade, warehousing, finance, advisory, FPO enablement, or consumer delivery. The opportunity is therefore not “an app that connects farmers and buyers.” That proposition already exists in many forms.

The defensible opportunity is an **Odisha-first transaction and fulfilment operating system** that joins workflows which are usually fragmented across separate platforms:

1. verified farmer/FPO supply and lot-level inventory;
2. direct consumer sales and structured institutional procurement;
3. buyer requirements, quotations, counter-offers, and explainable supplier matching;
4. multi-seller order assembly with explicit minimum-fill rules;
5. pre-harvest demand commitments and conditional reservations;
6. FEFO allocation, freshness monitoring, and seller-approved surplus rescue;
7. capacity-aware pickup, consolidation, cold-chain flags, trip execution, and proof of hand-off;
8. FPO membership, aggregation, and settlement records;
9. exceptions, disputes, audit trails, and role verification; and
10. English, Hindi, and Odia interfaces with low-bandwidth-safe behaviour.

The strongest research finding is that **digitising discovery is necessary but insufficient**. Evidence links better price realisation to the combination of market information and transport access, while e-NAM studies show both gains and mixed Odisha outcomes. This supports KISHAN BHAIYA’s integrated design: discovery should be connected to quality, aggregation, inventory reservation, logistics, payment evidence, and dispute handling rather than treated as a listing board.

No reviewed public product description documents the complete combination above. This is not proof that no competitor has an internal equivalent; it is a defensible statement about publicly documented capabilities as of the research date.

## 2. Research method and limitations

This is a desk-research landscape, not a full systematic review or field study.

- Priority was given to Government of India, Government of Odisha, multilateral, official company, and peer-reviewed sources.
- Current public product descriptions were used for the competitor comparison.
- Company scale and performance figures are self-reported unless the cited source is an independent or government publication.
- A blank capability in the comparison means **not found in the reviewed public description**, not necessarily that the organisation does not offer it.
- Products change, shut down, pivot, or operate only in selected districts. Field verification is required before making procurement, partnership, or investment decisions.
- “Existing solutions” means the major representative alternatives relevant to this product scope. It does not claim to enumerate every local trader, mandi, FPO tool, WhatsApp group, or Indian agritech startup.

## 3. Problem evidence

### 3.1 Odisha has large and increasingly market-oriented output

The Odisha Economic Survey 2025–26 reports record foodgrain production of **150 lakh metric tonnes in 2024–25**, including **118.6 lakh MT of rice** and **11.7 lakh MT of maize**. It reports vegetable production rising from **97.8 lakh MT in 2020–21 to 111.02 lakh MT in 2024–25**, and fruit production from **25.3 to 27.2 lakh MT**. This creates a large coordination problem around market access, aggregation, freshness, and movement, especially as horticulture expands. [R1]

The preceding Odisha Economic Survey describes market access as a major concern because of small holdings and low marketable surplus. It identifies mandis, cold storage, exports, and FPO formation as policy responses. It also reports roughly **1.1 crore farmers and agricultural labourers** in the state. [R2]

### 3.2 Post-harvest loss is material and measurable

The Government of India’s NABCONS study covering reference years 2020–22 estimates national post-harvest losses of **6.02–15.05% for fruits** and **4.87–11.61% for vegetables**. It estimates quantity losses of **7.36 million MT of fruits** and **11.97 million MT of vegetables**. [R3] [R4]

The same dataset reports meaningful Odisha-specific losses for commodities relevant to the platform, including approximately **13.19% for tomato, 13.64% for mushroom, 8.11% for onion, 7.65% for cauliflower, 7.30% for brinjal, 7.00% for potato, 6.25% for okra, and 4.17% for paddy**. These are state estimates from the NABCONS survey and should be treated as baselines, not guaranteed loss rates for every district or supply chain. [R5]

This evidence supports lot aging, FEFO allocation, early risk flags, planned pickup, cold-chain compatibility, and auditable rescue discounts. It does not justify claiming that an app alone can eliminate those losses.

### 3.3 Information and transport must work together

Research on Indian farmers’ market-channel choices finds that smallholders face fixed costs in reaching distant, remunerative markets. Better transport and communication are associated with better price realisation, with the strongest relationship appearing when road access and reduced information asymmetry occur together. [R6]

This finding directly supports combining buyer discovery with fulfilment planning. A matched buyer is not a completed market linkage if the farmer cannot aggregate the required quantity, meet the quality grade, finance the wait, or move the produce economically.

### 3.4 Digital markets show promise, but results are not automatically positive

A 2019 study of e-NAM found increasing adoption and higher farmer prices associated with e-auction, while still identifying implementation bottlenecks. [R7]

An Odisha-focused study produced a more cautionary result: after e-NAM, average monthly prices increased, but participating farmers received lower prices on average; it called for more markets, awareness, and training. [R8] Another Rajasthan study found gains in farmer prices or quantities but also room for operational improvements. [R9]

The implication is important: platform success should be measured through completed trade, net farmer realisation, payment time, rejection/shortage rate, loss avoided, and repeat participation—not registrations or listings alone.

### 3.5 Aggregation is a core mechanism, not an optional user role

A Nature Food scoping review of 239 studies found that farmer-organisation services improving market access, such as product marketing and market information, generally have positive effects on member income, yield, and product quality. [R10] A recent India-focused review similarly highlights the value of collective bargaining and market access while noting persistent issues in governance, documentation, finance, infrastructure, and farmer-led leadership. [R11]

Odisha’s Department of Agriculture reported that institutional market linkages created a **12–18% increase in price realisation** during April–December 2022 for linked FPO interventions, with more than 50 FPOs connected to private markets. This is a programme report, not a randomised evaluation, but it gives a useful local benchmark for pilots. [R12]

### 3.6 Traceability needs verified source data, not technology theatre

FAO notes that digital technologies can improve agrifood traceability through consistent data capture, aggregation, real-time tracking, and information sharing. [R13] Reviews of blockchain-based agricultural traceability find potential benefits in provenance, recall, transparency, and cross-party trust, but also identify adoption, interoperability, privacy, cost, input-data reliability, and maturity constraints. [R14] [R15]

For the current stage of KISHAN BHAIYA, a signed, append-only audit trail in a conventional database is more proportionate than blockchain. A distributed ledger should be considered only if independent organisations genuinely need to write to a shared record without trusting a common operator. Blockchain cannot make false farm or quality data true.

## 4. Existing solution landscape

### 4.1 Public and public-interest infrastructure

| Solution | What it already solves | Boundary or gap relevant to KISHAN BHAIYA |
|---|---|---|
| **Traditional APMC/RMC mandis and OSAMB** | Physical aggregation, regulated market locations, familiar auction/trader relationships, commodity-specific markets. OSAMB publishes the state’s principal-market structure. [R16] | Offline dependence, local reach, fragmented fulfilment data, variable quality digitisation, and limited farm-to-consumer workflow. These remain partners and channels, not merely competitors. |
| **e-NAM** | Pan-India electronic trading across integrated APMC mandis, transparent auction, quality-based price discovery, and online payment. As of March 2026, government reporting states 1,656 connected mandis, more than 1.80 crore farmers, 2.73 lakh traders, and 4,724 FPOs. [R17] [R18] | Primarily mandi/trading infrastructure; public descriptions do not document the complete retail, multi-seller, pre-harvest, rescue, and fleet-execution workflow proposed here. Odisha evidence shows onboarding and price outcomes need local operational support. |
| **AGMARKNET** | Market intelligence: prices, arrivals, mandi profiles, and infrastructure information. The Agmarknet 2.0 RFP describes more than 350 commodities, about 2,000 varieties, and data from thousands of APMC markets. [R19] | A data and intelligence source rather than end-to-end procurement and delivery. Source data can have manual-entry delay and consistency issues, which the 2.0 programme itself aims to address. |
| **ONDC** | An interoperable protocol—not a single marketplace—allowing buyer and seller applications to transact across an open network. Government reporting says roughly 5,000 FPOs had been onboarded by March 2024. [R20] [R21] | Useful distribution infrastructure and potential future channel. It does not by itself perform farm lot verification, FEFO reservation, FPO settlement, or physical aggregation. |
| **Kisan Rath** | Transport discovery for farmers, FPOs, traders, mandis, warehouses, processors, and markets, including part/full loads and reefer vehicles. [R22] | Primarily matches load requests to transport providers; the consignor negotiates offline. A MANAGE study reported declining interest/downloads after launch, demonstrating that onboarding and workflow completion matter. [R23] |
| **Central Foodgrains Procurement Portal / MSP systems** | Government foodgrain procurement reporting, farmer registration, procurement centres, transactions, and MSP payment monitoring. [R24] | Commodity and scheme-specific; not a general perishable marketplace or retail fulfilment layer. |
| **ORMAS** | Rural product development, producer/SHG/FPO market linkages, exhibitions, fairs, and buyer–seller meets in Odisha. [R25] | Strong institutional partner and offline channel; not publicly presented as a unified live inventory, reservation, and logistics operating system. |
| **Odisha horticulture and FPO programmes** | Support for FPOs, post-harvest infrastructure, cold stores, sabji coolers, crates, transit, storage rent, value addition, branding, and marketing. [R26] [R27] | Funding and physical capability can complement the platform. Digital allocation, dispatch, proof, and cross-party visibility remain integration opportunities. |

### 4.2 Commercial and cooperative-market alternatives

| Solution | Publicly documented focus | What it demonstrates | Remaining opening for this project |
|---|---|---|---|
| **Ninjacart** | End-to-end agri marketplace; farmer, trader, retailer, commerce, credit, quality, logistics, and information workflows. Its site reports 8 lakh+ farmers, 1 lakh+ retailers, and 120+ cities. [R28] | Logistics density, quality control, payments, and a managed supply chain matter as much as marketplace UI. | A major benchmark. KISHAN BHAIYA must differentiate through Odisha localisation, FPO operations, transparent multi-seller allocation, pre-harvest/rescue workflows, and open integrations—not generic farm-to-retail claims. |
| **WayCool / Outgrow** | Demand-led farm-to-store B2B supply chain, distribution infrastructure, retailer ordering, farmer advisory, and phygital last mile. [R29] [R30] | Demand planning, physical distribution points, daily replenishment, and local service partners. | Public descriptions do not show the same buyer-led quotation/counter-offer, visible seller split, and neutral marketplace model. |
| **DeHaat** | Full-stack farmer services: inputs, soil testing, advisory, financial services, and market linkages through a large physical centre/FPO network. [R31] | Farmer acquisition and trust require local centres and services before and after the sale. | Broader farm lifecycle than KISHAN BHAIYA; the project’s opening is deeper output procurement, fulfilment transparency, and buyer/fleet workflows. |
| **Bijak** | B2B discovery/listing, verified traders, mandi rates, payment assurance, working capital, and logistics support. [R32] [R33] | Trust scores, payment risk, trader networks, and negotiation are central to commodity trade. | KISHAN BHAIYA can focus on explicit lot provenance, FPO aggregation, direct retail, freshness, pre-harvest and surplus conversion, plus buyer-visible fulfilment composition. |
| **Agribazaar** | Verified B2B marketplace, negotiated terms, quality checks, logistics, tracking, digital payment, dispute handling, and stock management. [R34] | This is the closest functional benchmark for structured trade, settlement, and logistics. | Odisha-specific last-mile execution, consumer commerce, pre-harvest conditional supply, rescue workflows, and multi-seller minimum-fill logic remain differentiators if proven. |
| **Arya.ag** | Near-farm storage, warehouse visibility, finance, transparent grain commerce, and market linkage. IFC describes service to 800,000+ farmers and 3,000 FPOs across 21 states. [R35] | Storage and secured finance let farmers choose when to sell and can prevent distress selling. | Grain/storage/finance specialisation differs from a fresh-produce, retail-plus-procurement, execution-led platform. Arya.ag may be a future storage/finance partner rather than a direct substitute. |
| **Samunnati / FPO Next** | FPO- and value-chain-focused finance, trade, advisory, market linkage, digital transformation, and capacity building. [R36] | FPO sustainability requires governance, working capital, capability building, and market access together. | KISHAN BHAIYA is stronger as a transaction/operations layer and should integrate or partner for regulated finance rather than invent credit products. |
| **FarMart** | AI-powered food sourcing network connecting food companies, processors, suppliers, and logistics, with order visibility, live truck tracking, payment notifications, and debit notes. [R37] | Institutional buyers require traceable exceptions and commercial documents after a match. | A close B2B sourcing benchmark; the local farmer/FPO operating model, retail, rescue, and pre-harvest combination remain possible distinctions. |
| **Vegrow** | Managed B2B fruit marketplace using order aggregation, farm selection, grade matching, quality assurance, packing, and dispatch. [R38] | Grade-stack matching across multiple demand channels can reduce waste and improve farmer returns. | Fruit-specific managed model; KISHAN BHAIYA targets broader produce and a more explicit marketplace/FPO/fleet workflow. |
| **ITC e-Choupal / Choupal Saagar** | Phygital information, extension, procurement, warehousing, rural services, and direct farmer engagement. [R39] [R40] | Human intermediaries, local infrastructure, agronomy support, and trusted procurement teams remain valuable. | More vertically tied to ITC value chains; not a neutral retail and institutional multi-seller marketplace. |
| **KisanKonnect** | Farm-to-home fruit, vegetable, and grocery ordering through a consumer app. [R41] | Consumer convenience, assortment, repeat orders, and delivery experience define D2C success. | Does not publicly present the institutional procurement, FPO, fleet, pre-harvest, or multi-seller operations proposed here. |
| **Otipy/Crofarm** | Farm-to-consumer fresh produce delivery and community/social-commerce distribution. [R42] | D2C fresh-produce economics require dense demand, scheduled sourcing, and fast fulfilment. | Geographic and business-model caution: D2C by itself is not proof of a sustainable farmer-market platform. |
| **Farmizen** | Organic growing community, farm discovery, learning, listings, and direct WhatsApp contact for produce. Its site notes that grocery delivery ceased. [R43] | Community and provenance can attract users, but transactional and fulfilment operations determine durability. | Discovery/community rather than the full B2B and logistics stack. |
| **Informal channels: local traders, commission agents, phone/WhatsApp groups, and direct relationships** | Immediate liquidity, familiarity, inspection, credit bundling, flexible quantities, and low onboarding burden. | These channels solve trust and execution through relationships, even when price transparency is weak. | The digital product must preserve flexibility and assisted operation while making prices, weights, quality, commitments, and payments auditable. |

## 5. Capability comparison

Legend: **●** clearly documented in the reviewed public material; **◐** partial, adjacent, or partner-dependent; **—** not found in the reviewed public description. A dash is not proof of non-existence.

| Solution | D2C | Structured B2B / negotiation | FPO operations | Lot / quality traceability | Integrated logistics | Storage / finance | Pre-harvest supply | Surplus rescue | Multi-seller allocation |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| e-NAM | — | ● | ● | ◐ | ◐ | ◐ | — | — | — |
| ONDC ecosystem | ● | ◐ | ◐ | ◐ | ◐ | — | — | — | ◐ |
| Kisan Rath | — | — | ◐ | — | ● | — | — | — | ◐ |
| ORMAS | ◐ | ◐ | ● | ◐ | ◐ | ◐ | — | — | — |
| Ninjacart | ◐ | ● | ◐ | ● | ● | ● | ◐ | — | ◐ |
| WayCool | — | ● | ◐ | ● | ● | ◐ | ◐ | ◐ | ◐ |
| DeHaat | — | ● | ● | ◐ | ◐ | ● | ◐ | — | — |
| Bijak | — | ● | ◐ | ◐ | ● | ● | — | — | ◐ |
| Agribazaar | — | ● | ◐ | ● | ● | ◐ | ◐ | — | ◐ |
| Arya.ag | — | ● | ● | ● | ● | ● | — | — | ◐ |
| Samunnati | — | ● | ● | ◐ | ◐ | ● | ◐ | — | ◐ |
| FarMart | — | ● | ◐ | ● | ● | ◐ | ◐ | — | ◐ |
| Vegrow | — | ● | ◐ | ● | ● | ◐ | ● | ◐ | ● |
| e-Choupal | — | ● | ◐ | ● | ● | ● | ● | — | ◐ |
| KisanKonnect / Otipy | ● | — | ◐ | ◐ | ● | — | ◐ | ◐ | ◐ |
| **KISHAN BHAIYA target** | **●** | **●** | **●** | **●** | **●** | **◐** | **●** | **●** | **●** |

The target row includes capabilities present in the repository or explicitly represented by provider boundaries. It should not be marketed as proven impact until validated with real users, inventory, payments, and delivery operations.

## 6. The gap KISHAN BHAIYA can credibly claim

### Avoid this claim

> “There is no platform connecting farmers directly to consumers and businesses.”

That claim is demonstrably false. Many public and private systems already do some form of connection, trading, or fulfilment.

### Defensible positioning

> “Existing solutions usually specialise in mandi e-trading, market intelligence, transport discovery, managed B2B supply chains, storage and finance, FPO enablement, or consumer delivery. KISHAN BHAIYA is designed as an Odisha-first operational layer that connects verified lots and FPO aggregation to retail and structured procurement, then carries the transaction through multi-seller reservation, freshness-aware allocation, consolidated logistics, proof, settlement visibility, and exception handling.”

### Strongest differentiators to prove

1. **Explainable fulfilment:** show why suppliers were selected, the exact lot quantities reserved, freshness order, distance, price, quality, reliability, and capacity constraints.
2. **Buyer-defined minimum fill:** prevent fake success when a fragmented supplier set cannot meet the buyer’s minimum viable quantity.
3. **Pre-harvest-to-lot conversion:** preserve the relationship between forecast supply, conditional buyer reservations, actual harvest, quality, and final allocation.
4. **Seller-controlled rescue:** flag at-risk inventory but require producer approval for promotional pricing; measure avoided loss rather than merely number of offers.
5. **FPO-native operations:** membership approval, member-level contribution to aggregated lots, transparent deductions, and settlement splits.
6. **Execution, not matching only:** vehicle compatibility, capacity, pickup sequencing, hub consolidation, proof of pickup/delivery, and issue recovery.
7. **Local accessibility:** Odia, assisted onboarding, low-bandwidth behaviour, simple status language, and operator workflows.
8. **Auditable trust:** verification status, quality evidence, immutable audit events, complaint/dispute context, and bounded public seller profiles.

## 7. Research-driven product recommendations

### 7.1 Treat the platform as a managed network during the pilot

A two-sided app cannot bootstrap farmer supply, verified buyers, logistics capacity, quality grading, and support simultaneously without field operations. Start with one or two crop–district–buyer corridors and an operations dashboard. FPOs, RMCs, ORMAS/APICOL programmes, local pack houses, and transporters should be treated as ecosystem partners.

### 7.2 Add real quality and weight evidence

Every marketable lot should support:

- commodity, variety, grade, unit, quantity, harvest date, expected shelf life, and location;
- digital weighment evidence or operator-confirmed weight;
- photos and sampling time;
- moisture/quality parameters appropriate to the commodity;
- assayer/inspector identity and method;
- accepted tolerances and rejection rules; and
- a complete event trail from lot creation through split, reservation, dispatch, receipt, adjustment, and closure.

### 7.3 Optimise for net farmer realisation, not headline sale price

Display and measure:

`net farmer realisation = gross produce value − grading/packing − transport − platform fee − deductions/claims + incentives`

A nominally higher distant price may leave the farmer worse off after aggregation, rejection, and transport costs. Matching should optimise the expected net result subject to freshness, reliability, and service-level constraints.

### 7.4 Keep algorithms explainable

For each supplier match or route, show the major reasons and constraints. Do not present seeded or modelled prices, weather, routes, or savings as live facts. Maintain human approval for price changes, rescue offers, alternate suppliers, and dispute outcomes.

### 7.5 Use conventional traceability before blockchain

Implement unique lot IDs, append-only audit events, strict permissions, signed proof, timestamps, and protected evidence. Introduce a distributed ledger only when multiple independent institutions require shared writes and the governance, identity, and data-verification model is defined.

### 7.6 Integrate rather than replicate public infrastructure

Potential integrations or partnership directions include:

- AGMARKNET/e-NAM for reference prices and mandi context, subject to approved access and data-quality labelling;
- ONDC as a future discovery/order channel;
- Kisan Rath or commercial aggregators for expanded transport discovery;
- Odisha FPO, ORMAS, OSAMB, APICOL, horticulture, cold-store, sabji-cooler, crate, and transit-support programmes;
- regulated payment providers for collection and settlement;
- licensed lenders/warehouse-receipt providers for finance rather than lending directly; and
- FSSAI/FoSCoS and recall-compatible records where the operating role creates food-business obligations.

## 8. Pilot design and validation plan

### 8.1 Suggested pilot boundary

Choose one high-loss vegetable corridor and one more stable commodity corridor. A practical structure is:

- 2–3 FPOs or producer groups;
- 100–300 farmers;
- 10–20 verified institutional buyers plus a bounded consumer delivery zone;
- 5–10 transport partners with known vehicle classes;
- one pack/aggregation point per cluster; and
- 8–12 weeks covering repeated order cycles.

Crop and district selection should use production concentration, current buyer demand, travel time, loss rate, existing cold/pack infrastructure, and partner readiness—not only the theoretical size of the market.

### 8.2 Baseline before launch

Collect at least four weeks of baseline data for:

- farm-gate price and net realisation;
- quantity offered, sold, rejected, returned, consumed at home, or lost;
- buyer purchase price and fill rate;
- time from harvest to pickup and receipt;
- transport cost per kilogram and empty kilometres;
- payment time and deductions;
- disputes and quality reasons; and
- farmer/buyer repeat intent.

### 8.3 Primary outcome metrics

| Outcome | Recommended metric |
|---|---|
| Farmer economics | Median change in net realisation per kg versus comparable baseline/channel |
| Waste | Percentage of offered quantity rescued from spoilage or unsold disposal, with a documented counterfactual |
| Market linkage | Completed and accepted order value, not listed value |
| Buyer service | On-time-in-full rate and accepted fill rate |
| Freshness | Median harvest-to-delivery time; quantity allocated within FEFO rules |
| Logistics | Cost/kg, vehicle utilisation, empty km, and cold-chain compliance |
| Trust | Payment time, deduction rate, dispute rate, resolution time, and proof completeness |
| FPO value | Aggregated volume, number of contributing members, settlement accuracy, and member repeat rate |
| Inclusion | Active users by language, gender, farm size, assisted/digital mode, and device/network class |
| Product retention | Repeat sellers, buyers, and transport partners after 30/60/90 days |

Do not claim causality from simple before/after averages. Where possible, compare matched crops, weeks, and local channels and record weather/price shocks.

## 9. Risks and failure modes

| Risk | Why it matters | Mitigation |
|---|---|---|
| Thin marketplace liquidity | Listings without enough credible buyers lead to disappointment. | Start buyer-led; onboard committed demand before broad farmer acquisition. |
| Side-selling or buyer bypass | Parties may transact off-platform after discovery. | Provide real value in reservation, logistics, payment evidence, settlement, credit history, and dispute support. |
| Quality disagreement | Fresh produce grade is subjective and changes in transit. | Commodity-specific grade rules, timestamped sampling, tolerances, joint proof, and bounded adjustment workflow. |
| Fake or duplicate lots | Inflates supply and breaks reservations. | Verification, geotag/time evidence, operator checks, lot event history, and anomaly alerts. |
| Overbooking fragmented supply | Multi-seller plans can fail if one lot disappears. | Expiring reservations, reliability scores, alternates requiring approval, and buyer minimum-fill rules. |
| Unprofitable logistics | Small scattered loads erase price gains. | Collection windows, hub consolidation, minimum viable load, route/capacity optimisation, and transparent cost allocation. |
| Delayed settlement | Quickly destroys farmer trust. | Payment-state visibility, reconciliation, escrow/provider design where lawful, and exception SLAs. |
| Digital exclusion | Smartphone-first design can exclude intended users. | Assisted FPO/operator mode, local language, low-data pages, printable/SMS/WhatsApp-compatible summaries where permitted. |
| Algorithmic overclaim | Seeded estimates can be mistaken for live recommendations. | Label source, timestamp, confidence, and fallback; preserve human approval for high-impact decisions. |
| Privacy/document leakage | Verification files and phone/address data are sensitive. | Purpose limitation, private object storage, short-lived access, role-based permissions, retention rules, and audit logs. |
| Regulatory mismatch | Marketplace, seller, food-business, transporter, or payment roles create different duties. | Obtain state-specific legal review before production; document who is seller of record and who bears quality, tax, recall, and refund duties. |

## 10. Compliance and standards checklist

This section is issue-spotting, not legal advice.

- **Food safety and recall:** FSSAI states that a food business operator must initiate withdrawal where non-compliant food has been processed, manufactured, or distributed; the FoSCoS system manages recall information. Lot and recipient records should support rapid identification and withdrawal. [R44]
- **Weights, declarations, and e-commerce display:** review the Legal Metrology Act and Packaged Commodities Rules for packaged goods, mandatory declarations, units, and information displayed online. [R45]
- **Personal data:** the DPDP Act/Rules framework requires a mapped lawful purpose, clear notices, security safeguards, user rights handling, breach processes, processor contracts, and deletion/retention controls. The 2025 Rules have staged commencement dates, so counsel should verify which duties are in force at launch. [R46]
- **Consumer protection:** define the seller of record, cancellation/return/refund policy, grievance route, pricing and fee transparency, and protection against misleading claims or dark patterns.
- **GST and transport documents:** the GST portal’s taxpayer guidance states that inter-state motorised movement above the applicable consignment threshold generally requires an e-way bill, subject to exemptions and detailed rules. [R47]
- **Payments:** never hold or route customer funds outside a compliant payment-provider structure. Reconciliation and FPO/member settlement ledgers do not themselves authorise the platform to operate regulated payment or lending services.
- **Verification documents:** store private evidence separately from public profiles; expose status and safe metadata, not underlying identifiers or file keys.
- **Accessibility:** use clear status text in addition to colour, keyboard-safe flows, readable Odia fonts, reduced-motion support, and assisted alternatives for users who cannot complete digital verification alone.

## 11. Recommended one-minute problem statement

Odisha produces large and growing volumes of foodgrains, fruits, and vegetables, yet small and fragmented farmers still face limited buyer reach, weak bargaining power, uncertain quality acceptance, costly transport, delayed settlement, and measurable post-harvest loss. Existing systems solve parts of the chain—mandi e-trading, price information, transport discovery, FPO support, B2B sourcing, storage finance, or consumer delivery—but these workflows often remain disconnected. KISHAN BHAIYA proposes an Odisha-first operating layer that connects verified farm lots and FPO aggregation to retail and institutional demand, then executes the transaction through explainable matching, multi-seller reservation, freshness-aware allocation, consolidated logistics, proof, settlement visibility, and recovery from shortages or disputes.

## 12. Reference library

### Government of Odisha and local ecosystem

- **[R1]** Government of Odisha, *Odisha Economic Survey 2025–26: Highlights and Executive Summary*. https://finance.odisha.gov.in/sites/default/files/2025-08/OES%202025-26%20Highlights%20and%20Executive%20Summary%20-English.pdf
- **[R2]** Government of Odisha, *Odisha Economic Survey 2024–25: Full Document*. https://finance.odisha.gov.in/sites/default/files/2025-02/Economic%20Survey%202024-25%20-Full%20Document_1.pdf
- **[R12]** Department of Agriculture & Farmers’ Empowerment, Odisha, *Activity Report 2022–23*. https://agri.odisha.gov.in/sites/default/files/2024-08/ACTIVITY%20REPORT%202022-23%20FINAL_EMAIL.pdf
- **[R16]** Odisha State Agricultural Marketing Board, *Principal Markets*. https://osamb.odisha.gov.in/?page_id=919
- **[R25]** ORMAS, *About ORMAS*. https://ormas.odisha.gov.in/en/sun/page/about-ormas
- **[R26]** Department of Agriculture & Farmers’ Empowerment, Odisha, *Horticulture schemes and guidelines*. https://agri.odisha.gov.in/en/schemes-agriculture/horticulture?field_agriculture_sector_and_sch_target_id=All
- **[R27]** Department of Agriculture & Farmers’ Empowerment, Odisha, *Activity Report 2023–24*. https://agri.odisha.gov.in/sites/default/files/2024-08/AR%202024%20MAIL.pdf

### Government of India and public digital infrastructure

- **[R3]** Ministry of Food Processing Industries/NABCONS, *Study to Determine Post-Harvest Losses of Agri Produces in India* (2022). https://www.mofpi.gov.in/sites/default/files/phl_study_final_report_07.12.2022_2.pdf
- **[R4]** Ministry of Food Processing Industries, *Annual Report 2024–25*, post-harvest loss summary. https://www.mofpi.gov.in/sites/default/files/mofpi_annual_report_2024-25_english_21.08.2025.pdf
- **[R5]** Press Information Bureau, *NABCONS Study Assesses Post-Harvest Losses Across 54 Crops During 2020–22*. https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2151371&lang=2&reg=48
- **[R17]** e-NAM, official portal and programme overview. https://enam.gov.in/
- **[R18]** Press Information Bureau, *e-NAM network status as of March 2026*. https://www.pib.gov.in/PressNoteDetails.aspx?ModuleId=3&NoteId=158169&id=158169&lang=1&reg=22
- **[R19]** Directorate of Marketing and Inspection, *Agmarknet 2.0 RFP and current-system description*. https://agmarknet.gov.in/doc/Final%20_RFP_Agmarknet_2.0_v0.8.pdf
- **[R20]** Press Information Bureau, *ONDC Revolutionizes India’s E-commerce* (explains that ONDC is an open protocol, not a marketplace). https://www.pib.gov.in/PressReleasePage.aspx?PRID=2146920&lang=1&reg=3
- **[R21]** Press Information Bureau, *Around 5,000 FPOs registered on ONDC platform*. https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2010600&lang=2&reg=48
- **[R22]** Press Information Bureau, *Kisan Rath Mobile App*. https://www.pib.gov.in/pressreleasepage.aspx?lang=2&prid=1615352&reg=48
- **[R23]** MANAGE, *Transportation in Agriculture: A Case of Kisan Rath App*. https://www.manage.gov.in/publications/policybrief/Kisan%20Rath%20Policy%20Brief.pdf
- **[R24]** Food Corporation of India, *Central Foodgrains Procurement Portal*. https://cfpp.nic.in/
- **[R44]** FSSAI, *Food Recall*. https://fssai.gov.in/food-law/food-recall
- **[R45]** Department of Consumer Affairs, *Legal Metrology Act and Packaged Commodities Rules*. https://consumeraffairs.nic.in/hi/acts-and-rules/legal-metrology/the-legal-metrology-act-2009
- **[R46]** Ministry of Electronics and Information Technology, *Digital Personal Data Protection Rules 2025*. https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digital-Personal-Data-Protection-Rules-2025
- **[R47]** GST portal, *Welcome Kit for New Taxpayers* (e-way bill overview). https://tutorial.gst.gov.in/downloads/news/welcome_kit_for_new_taxpyers.pdf

### Research and independent evidence

- **[R6]** Birthal et al., *Farmers’ choice of market channels and producer prices in India: Role of transportation and communication networks*, Food Policy. https://www.sciencedirect.com/science/article/pii/S0306919218300320
- **[R7]** Reddy & Mehjabeen, *Electronic National Agricultural Markets, Impacts, Problems and Way Forward*. https://journals.sagepub.com/doi/10.1177/2277975218807277
- **[R8]** Khandagiri & Kannan, *Performance analysis of electronic national agricultural markets: some evidence from Odisha*. https://epubs.icar.org.in/index.php/AERR/article/view/140377
- **[R9]** ICAR, *Impact of adoption of e-trading through e-NAM on price realisation and market arrivals in Rajasthan*. https://epubs.icar.org.in/index.php/IJAgS/article/download/127701/48776/344826
- **[R10]** Bizikova et al., *A scoping review of the contributions of farmers’ organizations to smallholder agriculture*, Nature Food. https://www.nature.com/articles/s43016-020-00164-x
- **[R11]** Patil et al., *Unveiling the dynamics of farmer producer organizations in India: a systematic review*. https://www.nature.com/articles/s41599-025-05063-9
- **[R13]** FAO, *Feasibility study for application of digital technologies for improved traceability and transparency along agrifood value chains*. https://www.fao.org/family-farming/detail/en/c/1651890/
- **[R14]** Lv et al., *Blockchain-Based Traceability for Agricultural Products: A Systematic Literature Review*. https://www.mdpi.com/2077-0472/13/9/1757
- **[R15]** Rejeb et al., *The Role of Blockchain Technology in Promoting Traceability Systems in Agri-Food Production and Supply Chains*. https://www.mdpi.com/1424-8220/23/11/5342
- **World Bank**, *Agriculture Platforms in a Digital Era: Defining the Landscape*. https://documents1.worldbank.org/curated/en/851711521095180329/pdf/124304-WP-PUBLIC-AgriBookMar.pdf
- **World Bank**, *Digital financial services for agriculture handbook*. https://documents1.worldbank.org/curated/en/461421559326915086/pdf/The-Digital-Financial-Services-for-Agriculture-Handbook.pdf

### Existing-solution primary sources

- **[R28]** Ninjacart, official site. https://ninjacart.com/
- **[R29]** WayCool, logistics and distribution solution. https://waycool.in/logistic-distribution-solution
- **[R30]** WayCool Outgrow, farmer services. https://waycool.in/agriservices-outgrow
- **[R31]** DeHaat, official platform description. https://dehaat.in/en
- **[R32]** Bijak, official businesses overview. https://bijak.in/
- **[R33]** Bijak, platform terms and service description. https://bijak.in/terms-and-conditions/
- **[R34]** Agribazaar, marketplace description. https://www.agribazaar.com/our-products/marketplace
- **[R35]** International Finance Corporation, *IFC and Arya.ag partner to boost farmer incomes and strengthen India’s agri value chains*. https://www.ifc.org/en/pressroom/2026/ifc-and-technology-led-agri-platform-arya-ag-partner-to-boost-farmer-incomes-and-s
- **[R36]** Samunnati, official platform and solution overview. https://samunnati.com/
- **[R37]** FarMart, supplier network and sourcing-platform description. https://www.farmart.co/supplier-network
- **[R38]** Vegrow, official marketplace and operating-model description. https://www.vegrow.in/
- **[R39]** ITC, e-Choupal. https://itcportal.com/itc-businesses/agri-business/itc-e-choupal.html
- **[R40]** ITC, agriculture business and Choupal Saagar. https://itcportal.com/itc-businesses/agri-business.html
- **[R41]** KisanKonnect, current Google Play product page. https://play.google.com/store/apps/details?id=com.kisankonnect.in
- **[R42]** Crofarm/Otipy, official site. https://www.crofarm.com/home
- **[R43]** Farmizen, current site and service status. https://www.farmizen.com/

## 13. Final conclusion

The research validates the problem but changes the innovation story. The project should not compete on “farmer-to-buyer connection” alone. Its strongest thesis is **verified, freshness-aware, multi-party execution for fragmented Odisha supply**. The real test is whether it produces higher net farmer realisation, lower avoidable loss, dependable buyer fill, faster settlement, and economical consolidated transport. A focused field pilot with credible baselines will be more persuasive than adding more dashboard features or making unverified AI/blockchain claims.

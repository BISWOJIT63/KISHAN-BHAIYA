from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether, HRFlowable, Flowable
)
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.lib.colors import HexColor
from pathlib import Path
from datetime import date

OUT = Path(r"C:\SIH-2026\output\pdf\kishan-bhaiya-architecture-and-system-design.pdf")
OUT.parent.mkdir(parents=True, exist_ok=True)

PAGE_W, PAGE_H = A4
GREEN = HexColor("#256D4A")
DEEP = HexColor("#153A2A")
LIME = HexColor("#D7E99A")
CREAM = HexColor("#F8F4E9")
INK = HexColor("#17251E")
MUTED = HexColor("#526259")
LINE = HexColor("#D6DED5")
SKY = HexColor("#EAF4EF")
AMBER = HexColor("#F6E4B5")
RED = HexColor("#F7D7D0")
WHITE = colors.white

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverKicker", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=10, leading=14, textColor=LIME, alignment=TA_CENTER, spaceAfter=12))
styles.add(ParagraphStyle(name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=31, leading=37, textColor=WHITE, alignment=TA_CENTER, spaceAfter=14))
styles.add(ParagraphStyle(name="CoverSub", parent=styles["Normal"], fontName="Helvetica", fontSize=13, leading=20, textColor=HexColor("#DDEBE4"), alignment=TA_CENTER))
styles.add(ParagraphStyle(name="H1x", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=20, leading=25, textColor=DEEP, spaceBefore=2, spaceAfter=10, keepWithNext=True))
styles.add(ParagraphStyle(name="H2x", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=13, leading=17, textColor=GREEN, spaceBefore=14, spaceAfter=6, keepWithNext=True))
styles.add(ParagraphStyle(name="Bodyx", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.3, leading=14, textColor=INK, spaceAfter=7))
styles.add(ParagraphStyle(name="Small", parent=styles["BodyText"], fontName="Helvetica", fontSize=8, leading=11, textColor=MUTED, spaceAfter=3))
styles.add(ParagraphStyle(name="TableHead", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=8.2, leading=10, textColor=WHITE))
styles.add(ParagraphStyle(name="TableCell", parent=styles["BodyText"], fontName="Helvetica", fontSize=8, leading=10.5, textColor=INK))
styles.add(ParagraphStyle(name="TableCellSmall", parent=styles["BodyText"], fontName="Helvetica", fontSize=7.1, leading=9, textColor=INK))
styles.add(ParagraphStyle(name="Callout", parent=styles["BodyText"], fontName="Helvetica", fontSize=9, leading=13, textColor=DEEP, leftIndent=8, rightIndent=8, spaceBefore=3, spaceAfter=5))
styles.add(ParagraphStyle(name="Bulletx", parent=styles["BodyText"], fontName="Helvetica", fontSize=9, leading=13, textColor=INK, leftIndent=13, firstLineIndent=-8, spaceAfter=3))

def P(text, style="Bodyx"):
    return Paragraph(text, styles[style])

def bullets(items):
    return [P("- " + x, "Bulletx") for x in items]

def table(headers, rows, widths, small=False):
    cellstyle = "TableCellSmall" if small else "TableCell"
    data = [[P(h, "TableHead") for h in headers]] + [[P(str(c), cellstyle) for c in row] for row in rows]
    t = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GREEN),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, SKY]),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t

def callout(title, body, tint=SKY):
    t = Table([[P(f"<b>{title}</b><br/>{body}", "Callout")]], colWidths=[170 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), tint),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t

def diagram_box(label, detail, color=SKY, width=39 * mm):
    t = Table([[P(f"<b>{label}</b><br/><font color='#526259'>{detail}</font>", "Small")]], colWidths=[width])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), color),
        ("BOX", (0, 0), (-1, -1), 0.6, GREEN),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t

def flow(labels, details):
    cells=[]
    arrow_width = 3 * mm
    box_width = (170 * mm - (len(labels) - 1) * arrow_width) / len(labels)
    for i,(label,detail) in enumerate(zip(labels, details)):
        cells.append(diagram_box(label, detail, LIME if i == 0 else SKY, box_width))
        if i < len(labels)-1:
            cells.append(P("<b>-></b>", "H2x"))
    widths=[]
    for i in range(len(cells)):
        widths.append(box_width if i%2==0 else arrow_width)
    t=Table([cells], colWidths=widths, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("ALIGN", (1,0), (-1,-1), "CENTER"),
        ("LEFTPADDING", (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 0),
        ("TOPPADDING", (0,0), (-1,-1), 0),
        ("BOTTOMPADDING", (0,0), (-1,-1), 0),
    ]))
    return t

class ArchitectureDiagram(Flowable):
    """High-level production architecture diagram drawn as native PDF vectors."""
    def __init__(self):
        super().__init__()
        self.width = 170 * mm
        self.height = 158 * mm

    def wrap(self, availWidth, availHeight):
        return min(self.width, availWidth), self.height

    def _box(self, c, x, y, w, h, title, lines, fill=SKY, stroke=GREEN):
        c.setFillColor(fill)
        c.setStrokeColor(stroke)
        c.roundRect(x, y, w, h, 3, fill=1, stroke=1)
        c.setFillColor(DEEP)
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(x + w/2, y + h - 12, title)
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 6.5)
        line_y = y + h - 23
        for line in lines:
            c.drawCentredString(x + w/2, line_y, line)
            line_y -= 8

    def _arrow(self, c, x1, y1, x2, y2, label=None):
        c.setStrokeColor(GREEN)
        c.setFillColor(GREEN)
        c.setLineWidth(1)
        c.line(x1, y1, x2, y2)
        # arrowhead
        dx, dy = x2-x1, y2-y1
        d = max((dx*dx + dy*dy) ** 0.5, 1)
        ux, uy = dx/d, dy/d
        px, py = -uy, ux
        a = 5
        c.line(x2, y2, x2-a*ux+2.2*px, y2-a*uy+2.2*py)
        c.line(x2, y2, x2-a*ux-2.2*px, y2-a*uy-2.2*py)
        if label:
            c.setFillColor(MUTED)
            c.setFont("Helvetica", 6)
            c.drawCentredString((x1+x2)/2, (y1+y2)/2 + 3, label)

    def draw(self):
        c = self.canv
        W, H = self.width, self.height
        u = mm
        # diagram title band
        c.setFillColor(DEEP)
        c.roundRect(0, H-9*u, W, 8*u, 4, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(3*u, H-5.8*u, "Kishan Bhaiya - End-to-End System Architecture")
        c.setFillColor(HexColor("#DDEBE4"))
        c.setFont("Helvetica", 6.4)
        c.drawRightString(W-3*u, H-5.8*u, "Source of truth: Express + MongoDB")

        # Users / devices
        top_y = H - 29*u
        self._box(c, 2*u, top_y, 53*u, 16*u, "Users and devices", ["Buyer | Farmer | FPO", "Driver | Fleet | Admin"], LIME)
        self._box(c, 58.5*u, top_y, 53*u, 16*u, "React PWA", ["Role-aware UI", "i18n, mobile, maps"], SKY)
        self._box(c, 115*u, top_y, 53*u, 16*u, "Client state", ["React Query cache", "Zustand + Dexie drafts"], SKY)
        self._arrow(c, 55*u, top_y+8*u, 58.5*u, top_y+8*u, "HTTPS")
        self._arrow(c, 111.5*u, top_y+8*u, 115*u, top_y+8*u)

        # Transport
        transport_y = H - 53*u
        self._box(c, 27*u, transport_y, 52*u, 16*u, "Edge / transport", ["CDN or Vite static", "HTTPS, CORS, PWA cache"], CREAM)
        self._box(c, 91*u, transport_y, 52*u, 16*u, "Realtime channel", ["Socket.IO", "authenticated rooms"], CREAM)
        self._arrow(c, 85*u, top_y, 53*u, transport_y+16*u, "REST / JSON")
        self._arrow(c, 141*u, top_y, 117*u, transport_y+16*u, "events")

        # API centre
        api_y = H - 81*u
        self._box(c, 20*u, api_y, 130*u, 20*u, "Express modular monolith", ["Helmet, CORS, rate limits, cookies", "JWT optional/protected auth, Zod validation", "Versioned REST routes and structured errors"], HexColor("#DDF0E4"), DEEP)
        self._arrow(c, 53*u, transport_y, 70*u, api_y+20*u)
        self._arrow(c, 117*u, transport_y, 100*u, api_y+20*u)

        # services
        service_y = H - 111*u
        self._box(c, 1*u, service_y, 40*u, 17*u, "Commerce", ["catalog, orders", "cart, payment"], SKY)
        self._box(c, 44*u, service_y, 40*u, 17*u, "Supply", ["lots, FEFO", "FPO, harvest"], SKY)
        self._box(c, 87*u, service_y, 40*u, 17*u, "Procurement", ["matching", "split fulfillment"], SKY)
        self._box(c, 130*u, service_y, 39*u, 17*u, "Logistics", ["dispatch, route", "load sharing"], SKY)
        for xpos in (21*u, 64*u, 107*u, 149*u):
            self._arrow(c, 85*u, api_y, xpos, service_y+17*u)

        # persistence and providers
        db_y = H - 142*u
        self._box(c, 2*u, db_y, 52*u, 20*u, "MongoDB", ["users, products, lots", "orders, shipments, audit", "indexes + system record"], LIME, DEEP)
        self._box(c, 59*u, db_y, 52*u, 20*u, "Background jobs", ["freshness scheduler", "production: queue worker"], CREAM)
        self._box(c, 116*u, db_y, 52*u, 20*u, "Provider adapters", ["payment | route | weather", "geocode | image storage"], CREAM)
        self._arrow(c, 21*u, service_y, 28*u, db_y+20*u, "persist")
        self._arrow(c, 64*u, service_y, 85*u, db_y+20*u, "schedule")
        self._arrow(c, 149*u, service_y, 142*u, db_y+20*u, "integrate")

        # notes
        note_y = 3*u
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 6.2)
        c.drawString(2*u, note_y+4*u, "Security boundary: role + ACTIVE account status + resource ownership/assignment + server-side business checks.")
        c.drawString(2*u, note_y, "Scale path: CDN/WAF -> stateless API replicas -> managed MongoDB replica set -> Redis/BullMQ workers -> provider services.")

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.line(20*mm, 14*mm, 190*mm, 14*mm)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(20*mm, 8.5*mm, "Kishan Bhaiya | Architecture and System Design")
    canvas.drawRightString(190*mm, 8.5*mm, f"Page {doc.page}")
    canvas.restoreState()

def cover(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(DEEP)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setFillColor(GREEN)
    canvas.circle(PAGE_W*0.83, PAGE_H*0.84, 100, fill=1, stroke=0)
    canvas.setFillColor(HexColor("#317F59"))
    canvas.circle(PAGE_W*0.15, PAGE_H*0.12, 80, fill=1, stroke=0)
    canvas.restoreState()

story=[]
story += [Spacer(1, 48*mm), P("PRODUCT AND ENGINEERING BLUEPRINT", "CoverKicker"), P("Kishan Bhaiya", "CoverTitle"), P("Farm-to-market commerce, collective procurement, and capacity-aware smart logistics", "CoverSub"), Spacer(1, 17*mm)]
cover_card = Table([[P("<b>Architecture report</b><br/>Complete application purpose, roles, workflows, services, data model, API surface, security, deployment path, and production roadmap.<br/><br/>Prepared from the current codebase | " + date.today().isoformat(), "CoverSub")]], colWidths=[130*mm])
cover_card.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),HexColor("#1B4C36")),("BOX",(0,0),(-1,-1),0.6,HexColor("#6FAE84")),("LEFTPADDING",(0,0),(-1,-1),10), ("RIGHTPADDING",(0,0),(-1,-1),10), ("TOPPADDING",(0,0),(-1,-1),9), ("BOTTOMPADDING",(0,0),(-1,-1),9)]))
story += [cover_card, PageBreak()]

story += [P("Executive summary", "H1x"), P("Kishan Bhaiya is a role-governed agriculture ecosystem that links local producers, Farmer Producer Organisations (FPOs), retail buyers, business buyers, drivers, fleet partners and operations administrators. It is designed to make agricultural commerce more transparent from product discovery through to fulfillment, delivery, payments, and post-order resolution."),
          callout("Core product idea", "A buyer can discover trusted produce or raise a large requirement; verified producers can list supply, lots and future harvest; the platform can select and split supply across eligible sellers; and logistics operations can create capacity-safe trips, optimize stops, and consolidate compatible loads already in transit."),
          P("What the current implementation is", "H2x"),
          table(["Area", "Implementation"], [
              ["Application style", "MERN modular monolith: React/Vite client, Express API, MongoDB system of record."],
              ["State and realtime", "TanStack Query for server state, Zustand for safe device state, Socket.IO for authenticated cache invalidation and realtime enhancement."],
              ["Geospatial and logistics", "Coordinates, Leaflet maps, Haversine distance, constrained nearest-neighbour route estimate, and capacity/cold-chain checks."],
              ["Trust boundaries", "JWT access/refresh sessions, role and ACTIVE-status gates, validation, server-side totals, audit records, and private verification-document metadata."],
              ["Resilience", "PWA app shell, IndexedDB listing drafts, explicit provider fallbacks, and development-only memory fallback when configured."],
          ], [42*mm, 128*mm]),
          P("Business outcomes", "H2x"), *bullets([
              "Reduce producer dependence on opaque intermediaries by exposing supply, inventory, buyer demand and order status.",
              "Let buyers obtain larger quantities without manually contacting many growers, while showing why a seller or split was chosen.",
              "Avoid avoidable spoilage through FEFO lot allocation, freshness alerts, pre-harvest reservations and surplus rescue offers.",
              "Improve vehicle utilization by planning capacity-safe multi-pickup trips and accepting compatible loads while a vehicle is already in transit.",
              "Give each actor only the work and data appropriate to their role, including scoped dashboards and private verification processes.",
          ]), PageBreak()]

story += [P("1. Real-world problems solved", "H1x"),
          table(["Problem in agriculture", "Kishan Bhaiya response", "Measurable result"], [
              ["Fragmented smallholder supply", "Producer listings, FPO aggregation, lot records and multi-seller fulfillment plans combine supply while retaining seller identity.", "Higher fulfillment coverage and lower buyer coordination effort."],
              ["Price opacity and weak buyer trust", "Seller details, ratings/reliability context, quality passports, price intelligence and explainable matching.", "Better informed selection and traceability."],
              ["Manual B2B sourcing", "Business buyers publish requirements; platform produces ranked candidates, quotations, counters and capacity-aware split plans.", "Faster procurement cycle with documented negotiation."],
              ["Post-harvest waste", "Lot expiry/freshness states, scheduled rescue candidates, promotional rescue offers and FEFO reservations.", "More produce sold before quality declines."],
              ["Empty or under-used vehicles", "Automatic trip construction, vehicle/driver compatibility checks and in-transit load opportunities.", "Higher utilization and fewer duplicate trips."],
              ["Unclear delivery accountability", "Ordered stops, proof capture, exception reports, dispute records, audit trails and controlled status transitions.", "Stronger delivery evidence and faster recovery."],
              ["Digital access barriers", "English, Hindi and Odia interface, mobile navigation, PWA support, low-bandwidth animation setting and current-location capture.", "Broader rural and mobile usability."],
          ], [45*mm, 83*mm, 42*mm], small=True),
          P("Design principle", "H2x"), P("The platform does not treat all users as generic shoppers. It separates commerce, producer operations, FPO aggregation, fleet execution and administration. This avoids accidental data exposure and prevents roles such as farmer, driver or admin from buying retail products merely because they can reach a public route."),
          PageBreak()]

story += [P("2. Users, permissions and trust model", "H1x"),
          table(["Role", "Primary responsibilities", "Marketplace access"], [
              ["Consumer", "Browse, save produce, cart, checkout, track own orders, maintain profile and preferences.", "Can browse and purchase retail."],
              ["Business buyer", "All buyer actions plus bulk requirements, quotations, negotiation, recurring demand and multi-seller acceptance.", "Can browse, purchase and procure."],
              ["Farmer", "Create/manage produce and lots, publish expected harvest, offer surplus rescue, request FPO membership, see producer analytics.", "Producer workspace; no buyer checkout."],
              ["FPO manager", "Manage FPO catalog, members, aggregations and settlements.", "Producer/FPO workspace; no buyer checkout."],
              ["Driver", "See assigned trips only; start trip, follow next stop, submit proof, report issues and evaluate compatible in-transit loads.", "Logistics execution only."],
              ["Fleet/logistics partner", "Manage vehicles and dispatch, run planning, review shipment capacity and route estimates.", "Logistics operations only."],
              ["Administrator", "Review verification, resolve disputes, inspect audits and operational metrics.", "Administration only."],
          ], [31*mm, 101*mm, 38*mm], small=True),
          P("Authorization layers", "H2x"),
          flow(["Identity", "Role", "Account status", "Resource scope", "Business rule"], ["JWT subject", "What workspace", "Must be ACTIVE", "Only owned/assigned data", "Stock, capacity, status transition"]),
          Spacer(1,5),
          *bullets([
              "Registration assigns a role. Consumer accounts can be immediately active in the development flow; operational roles proceed through verification status.",
              "Express validates both role and account status before protected operations. A pending grower, business account or driver cannot use operational APIs until active.",
              "Resource checks add a second boundary: drivers are limited to shipments assigned to their user ID; producers are scoped to their seller-linked data; buyers see their own orders.",
              "The React navigation reflects the role, but the server is authoritative. Hiding a menu item is never relied upon as security.",
          ]),
          PageBreak()]

story += [P("3. Logical architecture", "H1x"),
          P("The codebase is a modular monolith. The modules are separated by responsibilities and provider interfaces, but the API deploys as one Express service. This is practical for a hackathon or early product: it reduces distributed-systems overhead while preserving clear seams for later extraction."),
          Spacer(1,4),
          flow(["React PWA", "Express API", "Domain services", "MongoDB"], ["Role-specific UI, React Query, Zustand", "REST, auth, validation, Socket.IO", "Matching, FEFO, fulfillment, routing", "System of record, indexes, data"]),
          Spacer(1,10),
          table(["Layer", "Responsibilities", "Principal technologies"], [
              ["Presentation", "Responsive role-aware screens, language resources, maps, charts, accessibility and purposeful motion.", "React 19, React Router 7, Tailwind CSS, Framer Motion, Lucide."],
              ["Client state", "Cache server records, invalidate after mutations/events, persist cart/session presentation/preferences safely.", "TanStack Query 5, Zustand 5, Axios, Dexie IndexedDB."],
              ["Transport", "Versioned JSON REST APIs, cookie/token support, realtime event channel.", "Express 5, Socket.IO 4, CORS, HTTP."],
              ["Domain", "Commerce, bulk procurement, lot allocation, FPO, dispatch, verification, dispute and analytics rules.", "JavaScript ES modules, Zod validation, service layer."],
              ["Persistence", "Operational data, users, products, lots, orders, shipments, verification, audit history.", "MongoDB 7, Mongoose 8."],
              ["External adapters", "Payment, route, weather, image upload and geocoding boundaries with labelled fallback behavior.", "Razorpay-ready, OpenRouteService-ready, Cloudinary-ready, Nominatim."],
          ], [29*mm, 90*mm, 51*mm], small=True),
          callout("Why this is extensible", "The matching service exposes weights and explanations, while the route service returns a provider-compatible result. A Python/OR-Tools optimizer, queue worker, payment gateway or commercial routing engine can be introduced behind these contracts without rewriting the React application.")]

story += [PageBreak(), ArchitectureDiagram(),
          Spacer(1, 5),
          callout("Reading the diagram", "React remains responsible for user experience and cache state. Express owns authorization and business rules. Domain services contain matching, FEFO allocation, fulfillment and routing logic. MongoDB is the system of record; jobs and external providers are invoked through clear boundaries."),
          PageBreak()]

story += [P("4. Frontend architecture", "H1x"),
          table(["Client module", "Role in system"], [
              ["src/api/client.js", "Central Axios client and request/auth handling for the versioned API."],
              ["src/layouts", "Public shell, dashboard shell and protected-route boundary."],
              ["src/pages", "Authentication, marketplace, cart, checkout, producer, FPO, bulk, logistics, verification, profile and static screens."],
              ["src/components", "Navbar, mobile bottom navigation, product cards, maps, realtime bridge, avatar, UI primitives and reusable motion."],
              ["src/store/useAppStore.js", "Safe presentation state: session representation, cart drafts, language/preferences and low-bandwidth setting. It is not the source of truth for orders or inventory."],
              ["src/i18n", "English, Hindi and Odia translation resources. Signed-in users change language from Profile > App preferences."],
              ["src/data/offlineDb.js", "Dexie/IndexedDB persistence for offline listing drafts; it does not pretend that an order or reservation succeeded while offline."],
          ], [45*mm, 125*mm]),
          P("Client request lifecycle", "H2x"),
          flow(["Screen", "Query/mutation", "API", "Cache/event"], ["Role-aware page", "React Query + Axios", "/api/v1 endpoint", "Invalidate/refetch after server persistence"]),
          Spacer(1,6),
          *bullets([
              "The public and dashboard layouts compute navigation from the logged-in role. Mobile navigation offers the same core account actions, including logout, without relying on desktop menus.",
              "RealtimeBridge authenticates the Socket.IO connection when an access token exists. Events are treated as a signal to invalidate cached records, not as a replacement for persisted API truth.",
              "Framer Motion provides different, restrained animation intent: commerce cards reveal gently; operations screens sequence efficiently; active logistics trips receive a calm live pulse. Low-bandwidth and OS reduced-motion preferences suppress non-essential movement.",
              "Leaflet/React Leaflet renders locations and route/stops. Browser geolocation can obtain current location; geocoding supports India-wide place lookup through a provider boundary rather than a hard-coded Odisha-only list.",
          ]), PageBreak()]

story += [P("5. Backend architecture and API", "H1x"),
          table(["Backend module", "Responsibility"], [
              ["src/app.js", "Express middleware pipeline: Helmet, CORS, JSON limits, cookies, static public uploads, auth rate limiting, optional auth, routes and structured errors."],
              ["src/server.js", "Database initialization, optional demo seeding in development, HTTP server, Socket.IO authentication/rooms and development scheduler."],
              ["src/routes/api.js", "Versioned REST resource surface and orchestration of permissions, persistence, service calls, audit and notifications."],
              ["src/middleware", "JWT protection, optional authentication, validation, error serialization and multipart upload limits."],
              ["src/services", "Data-store boundary, matching, fulfillment planner, load sharing, route optimization and geocoding."],
              ["src/providers", "Configurable integration boundary for payment, routing, weather, pricing and uploads."],
              ["src/jobs/scheduler.js", "Development freshness scheduling; production should replace critical scheduling with durable queue workers."],
          ], [45*mm, 125*mm]),
          P("API conventions", "H2x"), P("All endpoints are under <b>/api/v1</b>. Successful responses use <b>{ success, data, meta? }</b>; error responses use <b>{ success: false, error }</b>. API inputs with structured requirements are validated with Zod. Mutating operations calculate totals, stock and reservations on the server."),
          table(["Domain", "Representative operations"], [
              ["Identity", "register, login, refresh, logout, profile edit, profile photo and verification submission."],
              ["Commerce", "list/detail/related products, seller public profile, cart-to-order checkout, buyer order tracking."],
              ["Bulk procurement", "create requirement, rank matches, request quotes, counter/accept/reject, accept fulfillment plan."],
              ["Supply", "create product, lots, price intelligence, expected harvest, harvest reservation/convert, rescue offers."],
              ["FPO", "membership requests, members, aggregation and settlements."],
              ["Logistics", "shipments, dispatch, start, optimize, complete stops, issue/proof, load opportunities and acceptance."],
              ["Trust", "disputes, verification review and admin audit."],
          ], [38*mm, 132*mm]), PageBreak()]

story += [P("6. Data architecture", "H1x"),
          P("MongoDB is the system of record. Mongoose schemas define key fields and indexes; some related domain records use flexible schemas in the current modular-monolith implementation. Application IDs are string identifiers, making public IDs and seed records straightforward to manage."),
          table(["Entity group", "Key records", "Important ownership/reference"], [
              ["Identity and trust", "User, VerificationProfile, VerificationDocument, VerificationReview, Notification, AuditLog", "User role/status; document owner; reviewer and applicant references."],
              ["Catalog and supply", "Seller, Product, ProduceLot, QualityPassport, PriceSnapshot, RescueOffer", "Product/lot sellerId; lot productId; passport lotId."],
              ["Commerce", "Order, OrderSubFulfillment, Payment, Dispute", "Order buyerId/sellerId; sub-fulfillments expose per-seller execution."],
              ["Bulk procurement", "BulkRequirement, Quotation, Negotiation, ExpectedHarvest, HarvestReservation", "Requirement buyer/product; quote seller; reservation harvest and buyer."],
              ["FPO", "FPOProfile, FPOMember, FPOMembershipRequest, Aggregation, Settlement", "FPO/member relationship and aggregation records."],
              ["Logistics", "Shipment, ShipmentStop, Vehicle, DriverProfile, CollectionHub", "Shipment orderIds, vehicle/driver assignment and ordered stops."],
          ], [39*mm, 72*mm, 59*mm], small=True),
          P("Data integrity strategy", "H2x"), *bullets([
              "Indexes support common lookups such as role/status, product/seller, lots/expiry, order buyer/seller, shipment status and notification read state.",
              "Lot allocation is FEFO: earlier-expiring eligible inventory is selected before later-expiring stock, while unavailable/expired inventory is excluded.",
              "For production MongoDB replica sets, quotation acceptance and reservation/order creation should run inside a transaction to make multi-document state changes atomic.",
              "AuditLog and VerificationReview preserve who initiated sensitive decisions and the previous/next status, improving operational traceability.",
          ]), PageBreak()]

story += [P("7. Retail commerce workflow", "H1x"),
          flow(["Discover", "Evaluate", "Cart", "Checkout", "Fulfill", "Track"], ["Product/category", "Price, lot, seller", "Quantity-aware", "Server totals/payment", "Order/shipment", "Timeline/proof"]),
          Spacer(1,7),
          table(["Step", "What happens", "Control"], [
              ["1. Browse", "Only consumer and business-buyer roles are allowed into buyer commerce. Product discovery includes related and recently viewed produce.", "Role-aware routes and server-side purchasing permission."],
              ["2. Trust check", "Buyer can see public-safe seller information, reliability context, inventory summary, pricing and related products.", "Private verification evidence is never exposed via public seller views."],
              ["3. Cart", "Cart quantities are tracked locally for convenience, but the server remains authoritative for price and availability.", "Quantity and threshold validation."],
              ["4. Checkout", "API calculates totals, checks inventory and creates the order. Payment uses a Razorpay-ready boundary or explicitly labelled mock behavior in development.", "No client-calculated final price is trusted."],
              ["5. Fulfillment", "Inventory movement/order updates create records that logistics can use for dispatch and tracking.", "State transition and stock checks."],
              ["6. After sales", "Buyer views own orders and can create a dispute with context/evidence where applicable.", "Ownership scope and auditability."],
          ], [20*mm, 112*mm, 38*mm], small=True),
          callout("Retail limitation by design", "Farmers, FPO managers, drivers, fleet partners and administrators do not receive buyer checkout actions. They see their operational workspaces instead. This matches the requested role separation and prevents unauthorized ordering."),
          PageBreak()]

story += [P("8. Bulk procurement and multi-seller fulfillment", "H1x"),
          P("Bulk buying is a structured B2B workflow rather than a larger shopping cart. A business buyer declares the product, quantity, location, date, target price, quality and partial-fill preference. The platform produces candidates and, when needed, a transparent supplier split."),
          P("Candidate scoring", "H2x"),
          table(["Factor", "Weight", "Interpretation"], [
              ["Landed price", "30%", "Seller price plus distance-informed transport estimate compared to buyer target."],
              ["Distance", "20%", "Haversine distance between supply and requirement coordinates."],
              ["Coverage", "20%", "Share of requested quantity available from the seller."],
              ["Reliability", "15%", "Seller fulfillment reliability indicator."],
              ["Freshness", "10%", "Lot freshness state prioritizes fresh supply."],
              ["Quality", "5%", "Product grade compared with requested quality."],
          ], [42*mm, 22*mm, 106*mm]),
          P("Fulfillment workflow", "H2x"),
          flow(["Requirement", "Rank candidates", "Plan allocations", "Reserve FEFO lots", "Create sub-fulfillments", "Auto-plan trips"], ["Buyer need", "Explainable score", "Capacity aware", "Exact inventory", "Seller visibility", "Vehicle/driver/stops"]),
          Spacer(1,6),
          *bullets([
              "If full fill is required, the plan chooses an eligible single supplier that can cover the requirement. Otherwise it can allocate sequentially across ranked sellers until filled or supply runs out.",
              "Each allocation records quantity, allocation percentage, subtotal, estimated transport and split reason. The buyer can see why the split occurred rather than receiving an unexplained recommendation.",
              "Acceptance reserves exact eligible lots using FEFO and creates order sub-fulfillments so each seller can execute only their portion.",
              "Shortage reporting preserves an audit event and can calculate an alternate-supplier recovery plan for explicit buyer approval.",
          ]), PageBreak()]

story += [P("9. Supply, freshness and FPO workflows", "H1x"),
          table(["Workflow", "Business flow", "Value"], [
              ["Producer listing", "ACTIVE farmer/FPO manager creates product and supply lots with availability, grade/location and freshness information.", "Creates a trusted digital catalog and orderable inventory."],
              ["Lot management", "Lots carry expiry/freshness. Eligible lots are selected FEFO for supply reservations.", "Reduces waste and prevents reserving unsuitable stock."],
              ["Pre-harvest", "Producer publishes expected harvest; buyer makes conditional reservation; producer converts harvest into actual lot when available.", "Allows forward planning without falsely treating future yield as current stock."],
              ["Surplus rescue", "Freshness scheduler identifies at-risk stock; producer confirms a promotional rescue price; offer is persisted to marketplace context.", "Moves sell-soon produce before loss."],
              ["FPO membership", "Farmer submits join request; FPO manager approves/rejects; approved member enters aggregation and settlement workflow.", "Digitizes producer collective participation."],
              ["Settlements", "FPO views member/aggregation settlement records by organization scope.", "Improves transparency for pooled supply."],
          ], [38*mm, 88*mm, 44*mm], small=True),
          P("Scheduled freshness handling", "H2x"), P("A development scheduler runs freshness logic in-process. It is appropriate for demo and single-process development. Production should invoke the same idempotent domain operation through a durable, observable queue such as Redis/BullMQ, with retry policy and dead-letter handling."),
          PageBreak()]

story += [P("10. Smart logistics, routing and load consolidation", "H1x"),
          P("Logistics begins when an accepted multi-seller plan produces supplier allocations. The fulfillment planner turns those allocations into capacity-safe shipment drafts. It selects compatible available/idle vehicles and active drivers, constructs pickup/hub/delivery stops, and calls the route optimizer."),
          P("Automatic dispatch design", "H2x"),
          table(["Rule", "Current implementation"], [
              ["Vehicle capacity", "A draft uses available vehicle capacity. Segments are split across trips when supply exceeds available trip capacity."],
              ["Cold chain", "If any segment needs cold chain, compatible cold-chain vehicles are selected; incompatible configuration produces a warning."],
              ["Driver eligibility", "Only ACTIVE driver users with no current shipment are candidates. Assigned driver is attached to the trip."],
              ["Stop design", "Pickup stops are grouped by seller. A collection hub is added for multi-pickup trips when hub data is available, followed by delivery."],
              ["Route order", "Completed stops remain fixed. Pending stops are ordered with pickups first, then hubs, other stops and deliveries, using nearest-neighbour selection within each group."],
              ["Estimate", "Distance is Haversine-based; duration assumes average 32 km/h plus 18 minutes per intermediate handling stop. Fuel estimate varies by cold-chain use."],
          ], [40*mm, 130*mm]),
          P("In-transit spare-capacity workflow", "H2x"),
          flow(["Active trip", "Find candidates", "Compatibility preview", "Accept offer", "Merge and re-optimize"], ["IN_TRANSIT/PICKED_UP", "Unassigned planned loads", "Capacity, cold chain, detour", "Driver/fleet action", "Stops/order IDs/timeline"]),
          Spacer(1,6),
          *bullets([
              "An active trip must be IN_TRANSIT or PICKED_UP. A candidate must be a planned/ready unassigned load; a load already offered elsewhere cannot be taken.",
              "The system rejects invalid quantities, capacity overflow, cold-chain incompatibility and excessive detours. The safe detour threshold is max(20 km, 50% of existing route distance).",
              "On acceptance, candidate order IDs, segments and stops are merged into the active shipment; capacity utilization, route, timeline and acceptance audit fields are updated.",
              "This enables the requested practical behavior: a driver/fleet can accept a compatible additional load only when spare capacity and route constraints permit it.",
          ]), PageBreak()]

story += [P("11. Verification, security and privacy", "H1x"),
          table(["Security area", "Implemented approach", "Production hardening"], [
              ["Authentication", "JWT access token contains subject, role, name and account status. Refresh token is separately hashed and expires by configured TTL.", "Short access TTL, key rotation, secure cookie settings, session-reuse detection."],
              ["Authorization", "Role gate plus ACTIVE account enforcement plus ownership/assignment checks in API routes.", "Centralized policy engine and permission tests for every endpoint."],
              ["HTTP safety", "Helmet, disabled x-powered-by, configured CORS credentials/origins, auth rate limiter, body size limits and structured error handler.", "WAF, stricter rate limits, CSP review and security monitoring."],
              ["Input/file safety", "Zod structured validation; profile image type/size limits; verification evidence remains private metadata and does not expose secure file keys publicly.", "Malware scanning, signed URLs, encrypted object storage and retention rules."],
              ["Data integrity", "Server computes order totals and inventory availability; status transitions and high-impact actions create audit context.", "MongoDB transactions, outbox pattern and immutable audit storage."],
              ["Privacy", "Only public-safe seller details are shown. Driver phone is masked until assignment; documents do not become public profile assets.", "Consent records, data export/deletion workflow and formal privacy assessment."],
          ], [36*mm, 72*mm, 62*mm], small=True),
          callout("Important secret-management note", "Environment values must remain outside source control. Rotate any credential that was ever pasted into a document, chat, repository or example configuration, then replace it using the deployment secret manager. This report intentionally does not reproduce keys, passwords, tokens or connection strings.", RED),
          PageBreak()]

story += [P("12. Deployment, operations and scalability", "H1x"),
          P("The current application can run locally with a Vite development server, Express API and MongoDB. Docker Compose supplies a MongoDB 7 development service. It also supports a clearly labelled development-only in-memory fallback when MongoDB is unavailable; this fallback resets on restart and is never a production database strategy."),
          table(["Environment", "Recommended topology"], [
              ["Local development", "React/Vite on port 5173, Express/Socket.IO on port 5000, Docker MongoDB or dedicated demo MongoDB database, non-destructive fictional demo seed."],
              ["Staging", "Static client build behind CDN, containerized API, managed MongoDB replica set, object storage for uploads, observability and provider sandbox keys."],
              ["Production baseline", "CDN/WAF -> load balancer -> stateless API replicas -> managed MongoDB replica set. Redis/BullMQ workers for jobs, queue fan-out and retries. Cloud object storage/signed URLs for files."],
              ["Scale-out path", "Extract route optimization, notification delivery and heavy report/analytics workloads only when their traffic/compute warrants it. Keep APIs contract-driven."],
          ], [45*mm, 125*mm]),
          P("Operational observations", "H2x"), *bullets([
              "A port-in-use error (EADDRINUSE on 5000) means another server already owns that port. Stop the duplicate process or choose a different configured API port; it is not a database error.",
              "Login HTTP 500 errors should be diagnosed from API logs and database connectivity. The application’s development memory fallback may let the API start, but persistent account data requires a successful MongoDB connection.",
              "Monitor: API error rate/latency, MongoDB connection pool, order/reservation failures, queue depth, route plan duration, verification turnaround, upload failures and Socket.IO connection count.",
              "Back up MongoDB, test restoration, isolate tenant/demo data, and configure provider timeouts/circuit breakers before production use.",
          ]), PageBreak()]

story += [P("13. End-to-end workflow map", "H1x"),
          P("The following shows how the principal domain workflows connect. Every mutation goes to Express; client cache and realtime events improve the experience but do not bypass server persistence."),
          table(["Journey", "Start", "Core decision", "Persistent outcome"], [
              ["Consumer purchase", "Buyer discovers product", "Stock, server total and payment state validated", "Order, payment reference, fulfillment/shipment tracking."],
              ["Business procurement", "Buyer posts requirement", "Weighted candidate score and fill policy determine plan", "Quotes/negotiation, FEFO reservations, order sub-fulfillments and shipment drafts."],
              ["Producer supply", "Producer publishes product/lot or expected harvest", "ACTIVE status and supply/freshness rules", "Catalog inventory, conditional reservation or rescue offer."],
              ["FPO joining", "Farmer requests membership", "FPO manager approves/rejects", "Membership access to aggregation/settlement workflows."],
              ["Auto logistics", "Plan accepted", "Vehicle capacity, driver activity, cold chain and stop order", "Ready/planned shipments with optimized route estimate."],
              ["In-transit consolidation", "Active driver/fleet finds extra load", "Capacity, detour, status and cold-chain compatibility", "Merged active shipment, re-optimized route, timeline/audit acceptance."],
              ["Exception/dispute", "Issue or buyer dispute raised", "Authorized review and evidence/status rules", "Audit trail, resolution state and notification."],
          ], [31*mm, 38*mm, 57*mm, 44*mm], small=True),
          P("Event and cache sequence", "H2x"),
          flow(["User action", "Validated mutation", "Database write", "Audit/notification", "Socket signal", "Query refetch"], ["UI form", "Express+Zod+policy", "MongoDB", "Relevant side effect", "Invalidate cue", "Fresh source truth"]),
          Spacer(1,6),
          callout("Failure behavior", "The UI should never claim that a payment, order or reservation is complete merely because a client request was started or an offline draft was saved. Failures return an API error, preserve server truth, and can trigger a visible recovery workflow such as alternate supply review."),
          PageBreak()]

story += [P("14. Technology inventory", "H1x"),
          table(["Category", "Technology", "Purpose"], [
              ["Language/runtime", "JavaScript ES modules, Node.js 20+", "Shared full-stack language and server runtime."],
              ["Web client", "React 19, Vite 7, React Router 7", "Fast SPA development, routing and optimized production bundle."],
              ["UI", "Tailwind CSS, clsx, tailwind-merge, Lucide React, Framer Motion", "Responsive styling, icons and controlled contextual motion."],
              ["Data/UI forms", "TanStack React Query, Axios, React Hook Form, Zod", "Remote cache, HTTP, forms and validation."],
              ["Localization", "i18next, react-i18next", "English, Hindi and Odia user interface resources."],
              ["Maps/analytics", "Leaflet, React Leaflet, Turf helpers, Recharts", "Location, route/map display and dashboard visualization."],
              ["Offline/PWA", "vite-plugin-pwa, Dexie", "App shell caching and IndexedDB drafts."],
              ["API", "Express 5, Socket.IO, CORS, Helmet, Morgan, express-rate-limit", "REST/realtime, request safety, logging and rate limiting."],
              ["Identity/files", "jsonwebtoken, bcryptjs, cookie-parser, Multer", "Password hashing, token sessions, cookies and controlled multipart uploads."],
              ["Database/jobs", "MongoDB 7, Mongoose 8, node-cron", "Persistence, schemas/indexes and development freshness jobs."],
              ["Testing", "Vitest, Supertest, Testing Library, jsdom, ESLint", "API/business tests, component tests and static quality checks."],
              ["External-ready adapters", "Razorpay, Cloudinary, OpenRouteService, weather/geocoding providers", "Integration seams with explicit mock fallback state."],
          ], [34*mm, 61*mm, 75*mm], small=True),
          PageBreak()]

story += [P("15. Production roadmap", "H1x"),
          table(["Priority", "Next improvement", "Why it matters"], [
              ["P0", "Rotate exposed credentials; use managed secrets; verify no secrets are committed; enforce production environment validation.", "Protects database, tokens and third-party accounts."],
              ["P0", "Use a managed MongoDB replica set and transactions for multi-document reservations/order acceptance.", "Prevents partial fulfillment state under concurrency."],
              ["P0", "Move jobs, notifications and route fan-out to Redis/BullMQ workers with retries and idempotency keys.", "Makes background work reliable under replica scaling."],
              ["P1", "Integrate real payment, maps/directions, route distance matrix and weather providers with quotas, failure policies and user-facing truth labels.", "Improves operational accuracy without pretending mock data is live."],
              ["P1", "Store uploads in encrypted cloud object storage with malware scanning and signed URLs.", "Improves privacy and verification evidence handling."],
              ["P1", "Add observability: structured logs, trace IDs, metrics, error reporting, business KPI dashboards and alert rules.", "Enables fast 500-error diagnosis and safe operations."],
              ["P2", "Evolve optimizer to OR-Tools/time windows/vehicle classes and run simulations using actual transport history.", "Improves cost, fill rate and delivery ETA at scale."],
              ["P2", "Add SMS/WhatsApp/voice notifications and assisted workflows for low-connectivity users.", "Improves rural adoption and completion rates."],
              ["P2", "Formalize data-retention, consent, support and dispute SLA policies.", "Builds long-term trust and compliance readiness."],
          ], [20*mm, 92*mm, 58*mm], small=True),
          P("Conclusion", "H2x"), P("Kishan Bhaiya is more than a catalog: it is a governed agriculture operating system that connects supply discovery, trusted trade, collective procurement and practical logistics. Its current modular-monolith architecture is well suited to product validation while keeping interfaces ready for production-grade providers and selective service extraction."),
          callout("Recommended presentation summary", "Kishan Bhaiya helps buyers source verified produce, helps farmers/FPOs sell and coordinate supply, and helps logistics teams deliver more efficiently through capacity-aware planning and in-transit load consolidation. The platform maintains transparency at every hand-off through role-based access, inventory/lot controls, explanations and audit records.", LIME)]

doc = SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=20*mm, rightMargin=20*mm, topMargin=19*mm, bottomMargin=19*mm, title="Kishan Bhaiya Architecture and System Design", author="Kishan Bhaiya")
doc.build(story, onFirstPage=cover, onLaterPages=footer)
print(OUT)

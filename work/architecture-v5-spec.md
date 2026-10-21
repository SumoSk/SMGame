# SMGame v5 — Architecture Beauty Pass
Status: production art specification. Parking footprints are determined only by CATALOG in dist/game.js.
Design language: **Modern Stylized Realism**, readable from an isometric camera; strongly recognizable silhouettes, tier-based materials, believable entrances and rooflines, warm/cool nighttime accents, no excessive bloom/fog.
## Hard constraints
- Preserve precisely two long parking rows and one central lane; never change capacity.
- Each parking stall uses pitch **0.55 game units** and row center offsets **±0.94** from the common center aisle.
- No parking access/turning/vehicle/routing rewrite in this art pass (separate known routing issue, under investigation).
- Visual geometry must stay inside plot footprint under all 4 rotations, with only roof overhang and wall moldings allowed ~0.2 game units of margin.
- Use reusable primitive geometry, batched instancing, no external downloads or high-poly meshes; limit facade detail for long commercial buildings.
- Preserve rain, night, sun lighting and the user's no-fog requirement. All glowing emissive windows should be controlled by the existing day/night glow system.
## Buildings
| Kind | Small | Medium | Large |
| --- | --- | --- | --- |
| Home | Warm tiled pitched-roof cottage, porch | Split-level modern home, timber cladding and balcony | Luxury villa, layered terraces, panoramic glazing, pool and landscaping |
| Shop | Storefront with awning and signage | Two storefront volumes, articulated shopfronts | Premium retail parade with continuous covered arcade |
| Restaurant | Gabled cozy restaurant, timber porch | Bistro with glazed dining and outdoor seating | Signature modern restaurant, raised roof, warm canopy and dining terraces |
| Mall | Community mall with shopfronts | Lifestyle mall with glazed atrium | Destination mall with central skylight, stepped roof and multiple retail bays |
| Office | Compact glazed commercial block | Articulated glass tower, visible floors | Business tower with crown, curtain walls and roof machinery |
| Factory | Industrial shed, loading shutters | Warehouses with skylights | Industrial campus with roof ridge strips, loading bays and ventilation stacks |
| Pub | Dark lounge, neon entry | Club facade with light ribs | Premium nightclub with illuminated podium, roof terrace and colored accent blades |
| Park | Promenade, paths and flower beds | Fountain, trees and benches | Public garden with pavilion, geometric planting and lighting |
## Lighting
Warm white window lights and canopies for housing/shops; turquoise glass reflection highlights for malls/offices; subtle violet/cyan neon for pubs; low lanterns and warm landscape lights. Use separate glass/metal/stone/wood/water material roughness where feasible. All lights complement existing sun and weather.
## Performance
Limit to ~20–40 facade bays on extremely wide plots; batch identical meshes and avoid per-building light source objects. Night glow should be one existing emissive batch toggled by day/night.
## Validation
- Test 24 building models at four orientations for nonfinite geometry and bounds.
- Test 24 capacity/row counts, stall width and min clearance.
- Test access gates from both road sides separately; do not claim routing is fixed until integration passes.
- Verify main and gh-pages file contents match and Pages deployment succeeds.

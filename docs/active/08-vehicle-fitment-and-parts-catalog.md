# Vehicle Fitment and Parts Catalog Plan

## Goal

Make parts selection easy for low-technical-skill users by supporting guided vehicle selection and compatible parts filtering.

The user flow should be:

1. Enter registration number or VIN where available.
2. System attempts to prefill vehicle details.
3. User confirms or edits make, model, year, variant, and engine.
4. System filters compatible parts by selected vehicle.
5. Quote builder shows compatible parts first.
6. Supplier request can be created directly from selected compatible parts.

## South Africa provider strategy

### Primary fitment candidate

- [ ] Evaluate TecAlliance/TecDoc South Africa for commercial-grade parts fitment.

### Vehicle lookup candidates

- [ ] Evaluate TransUnion/eNatis access options.
- [ ] Evaluate Car Registration API South Africa.
- [ ] Evaluate VerifyNow vehicle lookup.
- [ ] Evaluate AA AutoFacts.

### Fallback approach

- [ ] Build manual make/model/year seed data.
- [ ] Allow tenant-maintained supplier catalogs.
- [ ] Allow CSV imports for suppliers.
- [ ] Allow manual override when external data is incomplete.

## Required dropdown hierarchy

- [ ] Make
- [ ] Model
- [ ] Year
- [ ] Variant/trim
- [ ] Engine
- [ ] Fuel type
- [ ] Transmission where relevant

## Data model checklist

- [ ] `vehicle_makes`
- [ ] `vehicle_models`
- [ ] `vehicle_model_years`
- [ ] `vehicle_variants`
- [ ] `vehicle_engines`
- [ ] `parts_catalog`
- [ ] `part_categories`
- [ ] `part_fitments`
- [ ] `supplier_part_offers`
- [ ] `supplier_part_inventory`
- [ ] `part_cross_references`
- [ ] `external_provider_mappings`

## API checklist

- [ ] `GET /api/vehicle-makes`
- [ ] `GET /api/vehicle-models?makeId=`
- [ ] `GET /api/vehicle-years?modelId=`
- [ ] `GET /api/vehicle-variants?modelId=&year=`
- [ ] `GET /api/vehicle-engines?variantId=`
- [ ] `GET /api/parts/compatible?vehicleId=`
- [ ] `GET /api/parts/search?query=&vehicleId=`
- [ ] `POST /api/vehicle-lookup`
- [ ] `POST /api/parts-fitment/sync`

## UX checklist

- [ ] Dropdowns load progressively.
- [ ] Users can search within dropdowns.
- [ ] Users can manually add missing make/model/year values with approval workflow.
- [ ] Show compatibility confidence.
- [ ] Show supplier availability and ETA.
- [ ] Show alternatives if exact part is unavailable.
- [ ] Warn when selected part has no confirmed fitment.
- [ ] Keep manual override auditable.

## Acceptance criteria

- [ ] A receptionist can select make/model/year without knowing internal IDs.
- [ ] A mechanic can search compatible parts from a job card.
- [ ] A floor manager can add a compatible part to a quote.
- [ ] A supplier can provide price/ETA for a requested part.
- [ ] The system clearly shows whether fitment is confirmed, suggested, or manually selected.

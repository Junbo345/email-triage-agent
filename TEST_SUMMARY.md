# Test Summary

Manual evaluation results from the exported Google Sheets audit log.

Source file:

`AI Triage Log.xlsx`

Latest evaluated run:

`2026-07-16T21:02:42.909Z`

Execution mode:

`send`

Run summary:

- Total log rows in run: 36
- Final processed message outcomes: 11
- Skipped rows: 14
- Final actions: 4 accept, 3 reject, 4 ignore
- Customer-facing sends: 7
- Ignored non-service messages: 4
- Errors in final rows: 0

The log contains both `processing_started` and final execution rows for processed messages. The table below uses only the final execution rows where `execution_kind` is populated, so each email appears once.

| Test ID | Email Subject | Expected Intent | Predicted Intent | Expected Location | Predicted Location | Expected Action | Actual Action | Correct or Incorrect | Failure Category | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| T001 | Deck staining estimate needed - Burlington | service_request | service_request | Burlington, outside Oakville | Burlington / Burlington, Ontario, Canada | reject | reject | Correct |  | Outside-service-area request correctly rejected. |
| T002 | Basement flooded - need help ASAP | service_request | service_request | Kerr Village / Navy Street, Oakville | Kerr Village, Navy Street / Oakville, Ontario, Canada | accept | accept | Correct |  | Oakville neighbourhood request correctly accepted. |
| T003 | Landscaping spring cleanup - Oakville | service_request | service_request | Oakville, L6H postal area | L6H postal code in Oakville / Oakville, Ontario, Canada | accept | accept | Correct |  | Oakville service request correctly accepted. |
| T004 | Pest control needed - ants in kitchen | service_request | service_request | Bronte Road in Oakville | Bronte Road in Oakville / Oakville, Ontario, Canada | accept | accept | Correct |  | Oakville street/location wording correctly accepted because Oakville was explicit. |
| T005 | We're hiring contractors and field staff | non_service | non_service | none | unknown | ignore | ignore | Correct |  | Recruiting email correctly ignored. |
| T006 | Electrical panel upgrade - Toronto address | service_request | service_request | Toronto / Etobicoke, outside Oakville | Toronto (Etobicoke, near Dundas and Martin Grove) / Toronto, Ontario, Canada | reject | reject | Correct |  | Outside-service-area request correctly rejected. |
| T007 | Urgent: Kitchen tap leaking under sink | service_request | service_request | Durand Drive in Oakville | Durand Drive in Oakville / Oakville, Ontario, Canada | accept | accept | Correct |  | Oakville service request correctly accepted. |
| T008 | Partner with us - expand your service offerings | non_service | non_service | none | unknown | ignore | ignore | Correct |  | Sales/partnership email correctly ignored. |
| T009 | HVAC service quote - Mississauga property | service_request | service_request | Mississauga, outside Oakville | Mississauga (Dundas and Hurontario area) / Mississauga, Ontario, Canada | reject | reject | Correct |  | Outside-service-area request correctly rejected. |
| T010 | Your June industry update + job board access | non_service | non_service | none | unknown | ignore | ignore | Correct |  | Newsletter/job-board email correctly ignored. |
| T011 | Delivery Status Notification (Failure) | non_service | non_service | none | unknown | ignore | ignore | Correct |  | Mail delivery bounce correctly treated as non-service and ignored. |

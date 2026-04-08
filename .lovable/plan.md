
## Add Multi-Line Rate Items & Notes to Jobs

### 1. Database Migration
- Add `line_items` JSONB column to jobs table (array of `{description, amount}` objects)
- The existing `rate` column will store the computed total of all line items

### 2. Update Types
- Add `LineItem` interface: `{ id: string, description: string, amount: number }`
- Add `lineItems` to the `Job` type

### 3. Update Add Job Dialog
- Replace single rate input with a dynamic list of line items
- Each line has a description (e.g. "Shoot day", "Fitting") and amount
- "Add Line" button to add more rows
- Auto-calculate total rate from all lines
- Add a Notes textarea field

### 4. Update Edit Job Dialog
- Same line items UI as Add dialog
- Load existing line items when editing
- Add Notes textarea

### 5. Display on Jobs Page
- Show line item breakdown in job cards/details
- Show notes under each job

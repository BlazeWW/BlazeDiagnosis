# Testing doc
 By Tiffany on 2026/06/25
> **NOTE:** The page tested was an already existing file. All testing was based on the version of the file that was sent to me, which may not match the currently deployed version.

## 1 Initial Render

- 14:00 - page didn't load
- 14:04 - installed missing dependency to load page
- 14:08 - Minor bug: Text in the Quotes table is not visible unless selected. Likely a color contrast issue between text and background.
- 14:12 - Found a problem with how the quote page and the quote creation page looks. Going to confirm with author before I continue with further testing.
- 15:02 - Response came in, file is correct, but it's rendering somewhere else — likely as modal or popup on top of the Quotes page, not as a separate page. I will continue testing the file as given -- correction, existing file. I tested it according to the file that was sent to me.
- 15:21 - Confirmed Items
```
Customer dropdown: Confirmed
Vehicle dropdown: Confirmed
Expiry Date field: Confirmed
Line items table with one empty row: Button confirmed, empty line unconfirmed
Notes textarea: Confirmed
Discount section: Confirmed
Summary card: Confirmed
```
- 15:24 - Summary shows R0.00 for all values

## 2 Validation

- 15:26 - Clicked "Save draft" 
- Expected error message "please select a job card and customer" confirmed and nothing is sent

## 3 Customer & Vehicle Dropdowns

- 16:11 - 
```
Bug/Discrepancy: In the live modal, Customer and Vehicle are rendered as dropdown selects. In the CreateQuote.jsx file, they are also dropdowns — but the options are typed input types(We have to type them in), it does not give a dropdown arrow or list for neither Customer nor Vehicle.
```

## 4 Expiry Date

- 16:15 - No expiry date section in given file but there is in the screenshot provided by author

## 5 Line Items -- Basic Input

- 16:20 - In the screenshot given by author, there is a button to add a line item but in the given file, the button is "Add Item".
- 16:21 - The given file input types regarding the Line Items do not make sense. Feels like guess work.
- 16:22 - Line total updates immediatly
 
## 6 Line Items -- Adding & Deleting Rows

- 16:23 - Clicked "Add Item", new empty row appears: confirmed
- 16:25 - Both rows calculate independently  
- 16:26 - Deleted second row. It disappears and leaves the first row unaffected.
- 16:27 - Deleted the first row. Does not leave one blank row and instead shows an empty table.

## 7 Summary Calculations

- 16:28 - Cannot test the summary as it is not in the given file.

## 8 Discount -- No Discount

- 16:30 - No discount area in given file, thus I cannot test it.

## 9 Discount -- Fixed Amount

- 16:30 - No discount area in given file, thus I cannot test it.

## 10 Discount -- Percentage

- 16:30 - No discount area in given file, thus I cannot test it.

## 11 Discount -- Edge Case (Overdiscount)

- 16:30 - No discount area in given file, thus I cannot test it.

## 12 Internal Notes

- 16:40 - No notes area in given file, thus I cannot test it.

## 13 Successful Save

- 15:02 - Screenshot given shows a bug: Clicking "Save Quote" with a customer and vehicle selected returns the error "Failed to create the base quote document." — the API call is failing. (This is in ##13 to show what the issue is by category.)
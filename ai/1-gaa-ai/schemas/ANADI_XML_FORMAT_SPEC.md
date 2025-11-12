# Anadi XML Format Specification

**Purpose:** Defines exact XML structure Anadi expects for event data  
**Based on:** Analysis of professional ground truth XMLs  
**Date:** November 4, 2025

---

## XML Structure

### Root Structure
```xml
<?xml version="1.0" encoding="utf-8"?>
<file>
  <ALL_INSTANCES>
    <instance>...</instance>
    <instance>...</instance>
    ...
  </ALL_INSTANCES>
</file>
```

### Instance Structure (Required Fields)
```xml
<instance>
  <ID>1</ID>                    <!-- Required: Numeric ID, unique, sequential -->
  <start>704</start>            <!-- Required: Start time in seconds (integer) -->
  <end>709</end>                <!-- Required: End time in seconds (integer) -->
  <code>1st Half Start</code>   <!-- Required: Event type code (see schemas) -->
</instance>
```

### Instance with Label (Optional)
```xml
<instance>
  <ID>3</ID>
  <start>706</start>
  <end>721</end>
  <code>Opp Regain Won</code>
  <label>
    <group>Turnover Won Zone</group>  <!-- Label category -->
    <text>M3 centre</text>             <!-- Label value -->
  </label>
</instance>
```

---

## Field Specifications

### ID
- **Type:** Integer
- **Format:** Sequential from 1
- **Required:** YES
- **Example:** `<ID>1</ID>`

### start
- **Type:** Integer (seconds)
- **Format:** Seconds from video start
- **Required:** YES
- **Example:** `<start>704</start>`
- **Note:** Event start timestamp

### end
- **Type:** Integer (seconds)
- **Format:** Seconds from video start
- **Required:** YES
- **Example:** `<end>709</end>`
- **Note:** Event end timestamp (can equal start for instant events)

### code
- **Type:** String
- **Format:** Event type from valid schema
- **Required:** YES
- **Allowed values:** See schema_*.json files
- **Examples:**
  - `Home Shot at Goal`
  - `Opp Corner`
  - `1st Half Start`
  - `Home Foul`

### label (Optional)
- **Required:** NO (only for certain event types)
- **Structure:**
  ```xml
  <label>
    <group>Category</group>
    <text>Value</text>
  </label>
  ```
- **Common groups:**
  - `Shot Outcome`: On Target, Off Target, Save, Blocked
  - `Turnover Won Zone`: A3 left, M3 centre, D3 right, etc.
  - `Free Kick`: Indirect, On Target, etc.

---

## Validation Rules

### Event Codes
- Must match exactly (case-sensitive)
- Must be from schema_*.json `actions` keys
- Examples: `Home Shot at Goal` ✅, `home shot` ❌

### Labels
- Only include if event type has allowed labels in schema
- `<group>` must match schema category
- `<text>` must be from allowed values array
- If event type has empty array `[]` in schema, no label allowed

### Timestamps
- `start` must be ≤ `end`
- Both must be positive integers
- Times in seconds (not milliseconds)
- Sequential IDs but timestamps can overlap/be out of order

### XML Encoding
- Encoding: `utf-8`
- Version: `1.0`
- Well-formed XML (properly nested, closed tags)

---

## Example Valid Events

### Simple Event (No Label)
```xml
<instance>
  <ID>5</ID>
  <start>815</start>
  <end>826</end>
  <code>Home Corner</code>
</instance>
```

### Event with Shot Outcome
```xml
<instance>
  <ID>12</ID>
  <start>1089</start>
  <end>1098</end>
  <code>Home Shot at Goal</code>
  <label>
    <group>Shot Outcome</group>
    <text>Save</text>
  </label>
</instance>
```

### Event with Zone Label
```xml
<instance>
  <ID>8</ID>
  <start>902</start>
  <end>917</end>
  <code>Home Regain Won</code>
  <label>
    <group>Turnover Won Zone</group>
    <text>M3 centre</text>
  </label>
</instance>
```

---

## Our Output Validation Checklist

- [ ] XML declaration with utf-8 encoding
- [ ] Root `<file>` element
- [ ] `<ALL_INSTANCES>` wrapper
- [ ] Sequential numeric IDs starting from 1
- [ ] All events have `<ID>`, `<start>`, `<end>`, `<code>`
- [ ] Event codes match schema exactly
- [ ] Labels only where schema allows
- [ ] Label values from schema allowed list
- [ ] Proper XML nesting and closing tags
- [ ] Times in seconds (integers)

---

## Common Errors to Avoid

❌ `<ID>ai-0001</ID>` - IDs must be plain numbers  
✅ `<ID>1</ID>`

❌ `<start>704.5</start>` - No decimals  
✅ `<start>704</start>`

❌ `<code>home shot</code>` - Wrong case/format  
✅ `<code>Home Shot at Goal</code>`

❌ Label on event with `[]` in schema  
✅ Only add labels where schema has values array

---

**Status:** Specification complete based on professional XMLs  
**Next:** Verify our output matches this spec exactly


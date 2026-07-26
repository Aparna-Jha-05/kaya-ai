## ADDED Requirements

### Requirement: PyMuPDF Evidence Region Extraction
The `PDFExtractorService` SHALL preserve the source page, raw excerpt, and PyMuPDF bounding box `[x0, y0, x1, y1]` for each extracted fact.

#### Scenario: Claim Node Evidence Mapping
- **WHEN** PyMuPDF locates a specification string (e.g. "Power: 1100 kW" or "Width: 1.85 m") in a PDF page
- **THEN** the system MUST capture the page coordinate system, rectangle, raw excerpt, parser method, and normalized fact in an evidence node

### Requirement: Evidence Quality Signals
The backend SHALL distinguish measured parser or model confidence from heuristic extraction-quality signals.

#### Scenario: PyMuPDF text extraction
- **WHEN** a fact is extracted from native PDF text without a model-provided probability
- **THEN** the system MUST report deterministic quality signals such as exact unit match and evidence-region availability and MUST NOT present a fabricated statistical confidence

### Requirement: Dimension Annotation Visualization
The backend SHALL return detected dimension annotations and their evidence regions for the frontend dimension visualizer; it SHALL NOT claim to parse complete CAD or BIM geometry.

#### Scenario: Door Width and Equipment Clearance Geometry
- **WHEN** processing textual or drawing dimension annotations in vendor bid PDFs
- **THEN** the system MUST return the detected value, unit, page, evidence rectangle, and interpretation status in the frontend contract

#### Scenario: Unsupported drawing
- **WHEN** the document does not contain reliably detectable dimension annotations
- **THEN** the system MUST return no geometry for that claim and a review flag instead of inventing coordinates

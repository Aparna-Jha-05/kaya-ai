## ADDED Requirements

### Requirement: Dynamic Site Constraint Modification API
The backend SHALL expose an authorized endpoint for creating a new immutable version of project site constraints.

#### Scenario: Constraint Threshold Adjustment
- **WHEN** an authorized client PUTs updated constraint values (e.g., `max_substation_kw: 1000.0`, `max_door_width_m: 1.8`, `max_embodied_carbon_kg: 400.0`)
- **THEN** the system MUST validate units and ranges, create a new constraint version, record actor and reason, and trigger assessment of active bid dockets against that version

#### Scenario: Concurrent constraint update
- **WHEN** the submitted expected version is older than the current constraint version
- **THEN** the system MUST reject the update with a conflict response and MUST NOT overwrite the newer version

### Requirement: Versioned Docket Re-Assessment
The backend SHALL create new patrol result versions for affected active dockets when site constraints change.

#### Scenario: Re-Evaluation Trigger
- **WHEN** site constraints are updated via API
- **THEN** the system MUST re-run affected deterministic patrols, preserve prior results, reference the new constraint version, and emit an audit event

#### Scenario: Human lifecycle decision already exists
- **WHEN** a re-assessment changes a patrol outcome for an awarded, rejected, or RFI-pending docket
- **THEN** the system MUST preserve the human lifecycle state and surface an `ASSESSMENT_CHANGED` review event

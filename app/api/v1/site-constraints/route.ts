import { NextRequest, NextResponse } from "next/server";
import { backendStore } from "@/lib/backendStore";

export async function GET() {
  const constraints = backendStore.getConstraints();
  return NextResponse.json({
    project_id: constraints.project_id,
    version: constraints.version,
    max_substation_kw: constraints.max_substation_kw,
    max_door_width_m: constraints.max_door_width_m,
    max_embodied_carbon_kg: constraints.max_embodied_carbon_kg,
    max_water_evap_gpm: constraints.max_water_evap_gpm,
    max_floor_load_kg_m2: constraints.max_floor_load_kg_m2,
  });
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { expected_version, max_substation_kw, max_door_width_m, max_embodied_carbon_kg, max_water_evap_gpm, max_floor_load_kg_m2 } = body;
    const updated = backendStore.updateConstraints(
      expected_version,
      max_substation_kw,
      max_door_width_m,
      max_embodied_carbon_kg,
      max_water_evap_gpm ?? null,
      max_floor_load_kg_m2 ?? null,
    );

    return NextResponse.json({
      status: "UPDATED",
      project_id: updated.project_id,
      new_version: updated.version,
      reassessed_bid_count: backendStore.getBids().length,
      constraints: {
        max_substation_kw: updated.max_substation_kw,
        max_door_width_m: updated.max_door_width_m,
        max_embodied_carbon_kg: updated.max_embodied_carbon_kg,
        max_water_evap_gpm: updated.max_water_evap_gpm,
        max_floor_load_kg_m2: updated.max_floor_load_kg_m2,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to update site constraints";
    if (msg.includes("Stale version")) {
      return NextResponse.json({ detail: msg }, { status: 409 });
    }
    return NextResponse.json({ detail: msg }, { status: 400 });
  }
}

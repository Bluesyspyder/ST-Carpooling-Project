export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const vehicle_no = searchParams.get("vehicle_no");

    if (!vehicle_no) {
      return NextResponse.json(
        { message: "Vehicle number is required" },
        { status: 400 }
      );
    }

    // Check if API key exists
    if (!process.env.FIRE_API_KEY) {
      console.log("❌ FIRE_API_KEY is missing");

      return NextResponse.json(
        { message: "FIRE_API_KEY is missing" },
        { status: 500 }
      );
    }

    const response = await axios.get(
      "https://api.fireapi.io/secure-app/rc-vehicle-info/v1",
      {
        params: {
          vehicle_no,
        },
        headers: {
          "x-api-key": process.env.FIRE_API_KEY,
        },
      }
    );

    console.log("✅ FireAPI Success:");
    console.log(response.data);

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.log("\n========== FIRE API ERROR ==========");
    console.log("Status:", error.response?.status);
    console.log("Data:", error.response?.data);
    console.log("Message:", error.message);
    console.log("====================================\n");

    return NextResponse.json(
      {
        message:
          error.response?.data?.message ||
          error.message ||
          "Unable to fetch vehicle details",
      },
      {
        status: error.response?.status || 500,
      }
    );
  }
}
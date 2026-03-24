import { describe, expect, test } from "bun:test";

const BASE_URL = "http://localhost:4000";

async function runTest() {
    console.log("1. Logging in...");
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: "admin@wildvision.gov.in",
            password: "admin123"
        })
    });

    if (!loginRes.ok) {
        console.error("Login failed:", await loginRes.text());
        return;
    }

    const loginData = await loginRes.json();
    const token = loginData.accessToken;
    console.log("Login successful. Token obtained.");

    console.log("\n3. Fetching Beats...");
    const beatsRes = await fetch(`${BASE_URL}/geography/beats`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!beatsRes.ok) {
        console.error("Beats fetch failed:", await beatsRes.text());
        return;
    }

    const beatsData = await beatsRes.json();
    const beats = beatsData.beats || [];
    console.log(`Found ${beats.length} beats`);

    if (beats.length > 0) {
        // Find a beat that we know should have cameras if possible. 
        // Seed script puts cameras in "Beat 1 - Center" (BT-001)
        const targetBeat = beats.find((b: any) => b.code === 'BT-001') || beats[0];
        const beatId = targetBeat.id;

        console.log(`\n4. Fetching Cameras for Beat ID: ${beatId} (${targetBeat.name})...`);
        const camerasRes = await fetch(`${BASE_URL}/cameras?beat_id=${beatId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!camerasRes.ok) {
            console.error("Cameras fetch failed:", await camerasRes.text());
        } else {
            const camerasData = await camerasRes.json();
            const cameras = camerasData.cameras || [];
            console.log(`Cameras in Beat count: ${cameras.length}`);
            console.log("Cameras Response:", JSON.stringify(camerasData, null, 2));
        }
    } else {
        console.log("No beats found, skipping camera filter test");
    }
}

runTest();

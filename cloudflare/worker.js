// YoLink API CloudFlare Worker
// github.com/erikbuild
// v20250610-1
//
// Note: The YoLink/YoSmart User Access API rate limits pretty agressively.  One request a minute seems to be fine!
//
// Create two ENV secrets in CloudFlare Worker:
//     YOLINK_CLIENT_ID  -- from your YoLink User Account Credentials
//     YOLINK_CLIENT_SECRET -- from your YoLink User Account Credentials
//     YOLINK_HOME_ID -- Optional: specific home ID if you have multiple homes

export default {
  async fetch(request, env, ctx) {
    try {
      // Step 1: Get OAuth 2.0 access token
      const tokenData = await getAccessToken(env);
      
      if (!tokenData || !tokenData.access_token) {
        return new Response(JSON.stringify({ error: 'Failed to obtain access token' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Step 2: Get device list to find temperature sensors
      const devices = await getDeviceList(tokenData.access_token, env);

      console.log(`Number of devices found: ${devices.length}`);
      
      if (!devices) {
        return new Response(JSON.stringify({ error: 'Failed to retrieve device list' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Filter for temperature sensors and get their states
      const tempSensors = devices.filter(device => 
        device.type === 'THSensor' || 
        device.type === 'TempSensor' ||
        device.modelName?.toLowerCase().includes('temp')
      );

      // Step 3: Get current temperature values for each sensor
      const sensorReadings = await Promise.all(
        tempSensors.map(async (sensor) => {
          const state = await getDeviceState(sensor.deviceId, sensor.token, tokenData.access_token, env);
          return {
            deviceId: sensor.deviceId,
            name: sensor.name,
            humidity: state.data?.state?.humidity,
            temperature: state.data?.state?.temperature,
            tempLimitMin: state.data?.state?.tempLimit?.min,
            tempLimitMax: state.data?.state?.tempLimit?.max, 
            unit: 'C',
            battery: state.data?.state?.battery,
            lastUpdated: state.data?.state?.reportAt
          };
        })
      );

      console.log(`Retrieved Device Count: ${sensorReadings.length}`);
      
      // Return the temperature data
      return new Response(JSON.stringify({
        success: true,
        count: sensorReadings.length,
        sensors: sensorReadings
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

async function getAccessToken(env) {
  const tokenUrl = 'https://api.yosmart.com/open/yolink/token';
  
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: env.YOLINK_CLIENT_ID,
    client_secret: env.YOLINK_CLIENT_SECRET
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString()
  });

  if (!response.ok) {
    throw new Error(`Token request failed: ${response.status}`);
  }

  return await response.json();
}

async function getDeviceList(accessToken, env) {
  const apiUrl = 'https://api.yosmart.com/open/yolink/v2/api';
  
  const requestBody = {
    method: 'Home.getDeviceList',
    time: Date.now(),
    targetId: env.YOLINK_HOME_ID // Optional: specific home ID if you have multiple homes
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    console.log(`Error: Device list request failed: ${response.status}`);
    throw new Error(`Device list request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.data?.devices || [];
}

async function getDeviceState(deviceId, deviceToken, accessToken, env) {
  const apiUrl = 'https://api.yosmart.com/open/yolink/v2/api';
  
  const requestBody = {
    method: 'THSensor.getState',
    targetDevice: deviceId,
    token: deviceToken,
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    console.log(`Failed to get state for device ${deviceId}: ${response.status}`);
    return null;
  }

  return await response.json();
}
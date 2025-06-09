# YoLink Temperature Sensor Plugin for TRMNL

## Prerequisites
### Retrieve your API Access Token
Generate a User Access Credential in the YoLink app if you haven't already.
1. Open YoLink App
1. Click the hamburger icon in the top left.
1. Click Settings > Account > Advanced Settings > User Access Credentials
1. Create a new credential if you don't already have one.  Otherwise, copy the *UIAD* and *Secret Key*.

In a terminal:
```bash
curl -X POST -d "grant_type=client_credentials&client_id={UAID}&client_secret={SECRETKEY}" https://api.yosmart.com/open/yolink/token`
```

`{"access_token":"ABCDEFGH123456789","token_type":"bearer", {...}`

Save your *access_token*; you'll need this for plugin to work.

### Retrieve the deviceId and token for the Temperature/Humidity Sensor
```bash
curl --location --request POST 'https://api.yosmart.com/open/yolink/v2/api' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {ACCESSTOKEN}' \
--data-raw '{"method":"Home.getDeviceList","time":1734595441905}'
```

From the results, note the *deviceId*, *name*, and *token* for each THSensor you want to retrieve data for.

### Test data 
```bash
curl --location --request POST 'https://api.yosmart.com/open/yolink/v2/api' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer ${access_token}' \
--data-raw '{"method":"THSensor.getState","targetDevice":"{DEVICEID}","token":"{DEVICETOKEN}"}'
```

## References
http://doc.yosmart.com/docs/yolinkapi/THSensor
http://doc.yosmart.com/docs/protocol/datapacket#BUDP
http://doc.yosmart.com/docs/account/Manage#5manageretrieveyolinkdevice
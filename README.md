# com.synology.surveillance
Control Synology Surveillance Station from Homey (www.athom.com)

**Want to show your appreciation for this app? A donation is possible via http://www.d2c.nl **

To be able to use this app, you need to supply the app with the IP of the Synology NAS, as well as the username and password of an admin. It's best to set up an admin purely for this purpose, by following these steps from a computer:

1. Login to your Synology
2. Click on "Surveillance Station" so it opens in a new window.
3. Click on the menu button, go to "User".
4. Click on "Add", fill in a username and password (remember both, you will be neeeing them later)
5. Click "Next", make sure to choose the profile with "Manager" rights. 
6. Click "Next", make sure to check all cameras you want to give access to.
7. Click "Complete".

Also make sure your Synology has a fixed IP in your network.


The following cards are available:
- [ACTION] Start recording
- [ACTION] Stop recording
- [ACTION] Take snapshot (will go to /USERNAME/@Snapshot/ on your Synology)
- [ACTION] Mail snapshot (first fill in SMTP settings under 'Settings' in Homey!)
- [ACTION] Take snapshot as token for use with Homey
- [ACTION] Enable camera
- [ACTION] Disable camera
- [CONDITION] Is the camera recording?
- [CONDITION] Is the camera available?
- [TRIGGER] Starts recording (require enable_polling checked on settings page)
- [TRIGGER] Stops recording (require enable_polling checked on settings page)
- [TRIGGER] Becomes available (require enable_polling checked on settings page)
- [TRIGGER] Becomes unavailable (require enable_polling checked on settings page)

Use at your own risk, I accept no responsibility for any damages caused by using this script.

# Changelog

**Version 2.0.3**
- Typofix

**Version 2.0.2**
- Fixed a bug that would crash the app if statuschecks were enabled.

**Version 2.0.1**
- Fixed a bug when handling multiple webcams

**Version 2.0.0**
- Homey SDK2 version
- Snapshot as token will now take a snapshot as a Homey image token (usable in other apps like email-sender, Telegram etc)
- Snapshot-to-mail function removed (install email-sender app if you want to do this)

**Version 1.2.9**
- Fix for snapshot-to-mail function (Thanks evad!)
- If you still have problems with the functionality of this app, you probably have had this app from before version 1.2.6 which had some big changes. Please remove your Synology webcam from Homey and re-add it. This should solve it.

**Version 1.2.8**
- Fixed typo

**Version 1.2.7**
- Bugfix for crashes on Homey 1.5.x
- Bugfix for pairing with multiple cameras

**Version 1.2.6**
- Added support for camera's on multiple Synology's in combination with the Telegram app's "/snap" functionality. If you already have multiple Synology's connected, you will have to delete all but one to be able to screenshot via Telegram, then add them again.

**Version 1.2.5**
- Snapshot now available as token. You can use the "Take snapshot as token" card to take a snapshot and save it as a Homey token, which you can then use in combination with other supported Homey apps such as the Telegram app.

**Version 1.2.4**
- Somehow some node_modules got damaged

**Version 1.2.3**
- Update to support interaction with Telegram app

**Version 1.2.2**
- Small bugfix regarding enable/disable cards

**Version 1.2.1**
- Fixed bug causing devices not being able to add on Homey firmware 0.9.1

**Version 1.2.0**
- New action cards that enable and disable a camera.

**Version 1.1.7**
- Better error catching to prevent crashing app.

**Version 1.1.6**
- Better error catching to prevent crashing app.

**Version 1.1.5**
- After "error code 105" the polling stopped. I hope this update solves it.

**Version 1.1.4**
- Better error handling in case of 'Socket hangup'. Synology devices do that sometimes.

**Version 1.1.3**
- Triggers now work correctly
- Polling didn't survive a restart of the app, fixed

**Version 1.1.2**
- Small bug fixes

**Version 1.1.1**
- Small bug fixes

**Version 1.1.0**
- Removed requirement of external node modules, which makes the package much smaller
- Now supports multiple Synology NAS devices, settings get stored per camera
- Login & Logout per action, to support multiple NAS devices and at the same time this prevents a lockout when Synology decides the session ID has expired
- Settings page now has a 'Use encrypted connection' setting that you can use if your mail provider supports (or requires) it.
- Settings page now has an 'enable polling' button. If you check this, Homey will check the status of every camera every 10 seconds. This enables the triggers.

**Version 1.0.3:**
- There now is a 'test' button in the settings menu. This will test your mail settings and display it either being sent successful, or return the error.

**Version 1.0.0:**
Initial version

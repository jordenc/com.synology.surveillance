# com.synology.surveillance
Control Synology Surveillance Station from Homey (www.athom.com)

To be able to use this app, you need to supply the app with the IP of the Synology NAS, as well as the username and password of an admin. 

1. Make sure to add a user that doesn't require 2 factor authentication. 
2. Add the user to the 'administrators' group, because of the required permissions.
3. Under 'applications', allow the user to access the Surveillance Station

The following cards are available:
- [ACTION] Start recording
- [ACTION] Stop recording
- [ACTION] Take snapshot (will go to /USERNAME/@Snapshot/ on your Synology)
- [ACTION] Mail snapshot (first fill in SMTP settings under 'Settings' in Homey!)
- [CONDITION] Is the camera recording?
- [CONDITION] Is the camera available?
- [TRIGGER] Starts recording (require enable_polling checked on settings page)
- [TRIGGER] Stops recording (require enable_polling checked on settings page)
- [TRIGGER] Becomes available (require enable_polling checked on settings page)
- [TRIGGER] Becomes unavailable (require enable_polling checked on settings page)

Use at your own risk, I accept no responsibility for any damages caused by using this script.

# Changelog
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
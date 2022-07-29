import { parseError } from '../utils/functions.js';
import platformLang from '../utils/lang-en.js';

const fanState = {
  ON: 'MwEBAAAAAAAAAAAAAAAAAAAAADM=',
  OFF: 'MwEAAAAAAAAAAAAAAAAAAAAAADI=',
  SWING_ON: 'Mx8BAQAAAAAAAAAAAAAAAAAAACw=',
  SWING_OFF: 'Mx8BAAAAAAAAAAAAAAAAAAAAAC0=',
  SPEED_1: 'MwUBAQAAAAAAAAAAAAAAAAAAADY=',
  SPEED_2: 'MwUBAgAAAAAAAAAAAAAAAAAAADU=',
  SPEED_3: 'MwUBAwAAAAAAAAAAAAAAAAAAADQ=',
  SPEED_4: 'MwUBBAAAAAAAAAAAAAAAAAAAADM=',
  SPEED_5: 'MwUBBQAAAAAAAAAAAAAAAAAAADI=',
  SPEED_6: 'MwUBBgAAAAAAAAAAAAAAAAAAADE=',
  SPEED_7: 'MwUBBwAAAAAAAAAAAAAAAAAAADA=',
  SPEED_8: 'MwUBCAAAAAAAAAAAAAAAAAAAAD8=',
};
export default class {
  constructor(platform, accessory) {
    // Set up variables from the platform
    this.hapChar = platform.api.hap.Characteristic;
    this.hapErr = platform.api.hap.HapStatusError;
    this.hapServ = platform.api.hap.Service;
    this.log = platform.log;
    this.platform = platform;

    // Set up variables from the accessory
    this.accessory = accessory;
    this.name = accessory.displayName;

    // Set the correct logging variables for this accessory
    this.enableLogging = accessory.context.enableLogging;
    this.enableDebugLogging = accessory.context.enableDebugLogging;

    // Remove any old original Fan services
    if (this.accessory.getService(this.hapServ.Fan)) {
      this.accessory.removeService(this.accessory.getService(this.hapServ.Fan));
    }

    // Add the fan service for the fan if it doesn't already exist
    this.service = this.accessory.getService(this.hapServ.Fanv2) || this.accessory.addService(this.hapServ.Fanv2);

    // Add the set handler to the fan on/off characteristic
    this.service
      .getCharacteristic(this.hapChar.Active)
      .onSet(async (value) => this.internalStateUpdate(value));
    this.cacheState = this.service.getCharacteristic(this.hapChar.Active).value ? 'ON' : 'OFF';

    // Add the set handler to the fan rotation speed characteristic
    this.service
      .getCharacteristic(this.hapChar.RotationSpeed)
      .setProps({
        minStep: 12.5,
        minValue: 0,
      })
      .onSet(async (value) => this.internalSpeedUpdate(value));
    this.cacheSpeed = `SPEED_${this.service.getCharacteristic(this.hapChar.RotationSpeed).value * 0.08}`;

    // Add the set handler to the fan swing mode
    this.service
      .getCharacteristic(this.hapChar.SwingMode)
      .onSet(async (value) => this.internalSwingUpdate(value));
    this.cacheSwing = this.service.getCharacteristic(this.hapChar.SwingMode).value === 1 ? 'SWING_ON' : 'SWING_OFF';

    // Output the customised options to the log
    const normalLogging = this.enableLogging ? 'standard' : 'disable';
    const opts = JSON.stringify({
      logging: this.enableDebugLogging ? 'debug' : normalLogging,
    });
    this.log('[%s] %s %s.', this.name, platformLang.devInitOpts, opts);
  }

  async internalStateUpdate(value) {
    try {
      const newValue = value ? 'ON' : 'OFF';

      // Don't continue if the new value is the same as before
      if (this.cacheState === newValue) {
        return;
      }

      // Send the request to the platform sender function
      await this.platform.sendDeviceUpdate(this.accessory, {
        cmd: 'stateFan',
        value: fanState[newValue],
      });

      // Cache the new state and log if appropriate
      this.cacheState = newValue;
      if (this.enableLogging) {
        this.log('[%s] %s [%s].', this.name, platformLang.curState, newValue);
      }
    } catch (err) {
      // Catch any errors during the process
      const eText = parseError(err);
      this.log.warn('[%s] %s %s.', this.name, platformLang.devNotUpdated, eText);

      // Throw a 'no response' error and set a timeout to revert this after 2 seconds
      setTimeout(() => {
        this.service.updateCharacteristic(this.hapChar.Active, this.cacheState === 'ON' ? 1 : 0);
      }, 2000);
      throw new this.hapErr(-70402);
    }
  }

  async internalSwingUpdate(value) {
    try {
      const newValue = value ? 'SWING_ON' : 'SWING_OFF';
      // Don't continue if the new value is the same as before
      if (this.cacheSwing === value) {
        return;
      }

      await this.platform.sendDeviceUpdate(this.accessory, {
        cmd: 'stateFan',
        value: fanState[newValue],
      });

      // Cache the new state and log if appropriate
      this.cacheSwing = newValue;
      if (this.enableLogging) {
        this.log('[%s] %s [%s].', this.name, platformLang.curState, newValue);
      }
    } catch (err) {
      // Catch any errors during the process
      const eText = parseError(err);
      this.log.warn('[%s] %s %s.', this.name, platformLang.devNotUpdated, eText);

      // Throw a 'no response' error and set a timeout to revert this after 2 seconds
      setTimeout(() => {
        this.service.updateCharacteristic(this.hapChar.SwingMode, this.cacheSwing === 'SWING_ON' ? 1 : 0);
      }, 2000);
      throw new this.hapErr(-70402);
    }
  }

  async internalSpeedUpdate(value) {
    try {
      // Don't continue if the value is lower than 12.5
      if (value < 12.5) {
        return;
      }
      const newValue = `SPEED_${value * 0.08}`;
      // Don't continue if the new value is the same as before
      if (this.cacheSpeed === newValue) {
        return;
      }

      await this.platform.sendDeviceUpdate(this.accessory, {
        cmd: 'stateFan',
        value: fanState[newValue],
      });

      // Cache the new state and log if appropriate
      this.cacheSpeed = newValue;
      if (this.enableLogging) {
        this.log('[%s] %s [%s].', this.name, platformLang.curState, newValue);
      }
    } catch (err) {
      // Catch any errors during the process
      const eText = parseError(err);
      this.log.warn('[%s] %s %s.', this.name, platformLang.devNotUpdated, eText);

      // Throw a 'no response' error and set a timeout to revert this after 2 seconds
      setTimeout(() => {
        this.service.updateCharacteristic(this.hapChar.RotationSpeed, parseInt(this.cacheSpeed.split('_')[1] ?? '0', 10) / 0.08);
      }, 2000);
      throw new this.hapErr(-70402);
    }
  }

  externalUpdate(params) {
    // Don't apply the update during the five second timeout from controlling speed
    if (this.updateTimeoutAWS) {
      return;
    }

    // Check for some scene change
    if (!params.scene) {
      return;
    }

    switch (params.scene) {
      case fanState.ON: {
        // Turned ON
        if (this.cacheState !== 'ON') {
          this.cacheState = 'ON';
          this.service.updateCharacteristic(this.hapChar.Active, 1);

          // Log the change if appropriate
          if (this.enableLogging) {
            this.log('[%s] %s [%s].', this.name, platformLang.curState, this.cacheState);
          }
        }
        break;
      }
      case fanState.OFF: {
        // Turned OFF
        if (this.cacheState !== 'OFF') {
          this.cacheState = 'OFF';
          this.service.updateCharacteristic(this.hapChar.Active, 0);

          // Log the change if appropriate
          if (this.enableLogging) {
            this.log('[%s] %s [%s].', this.name, platformLang.curState, this.cacheState);
          }
        }
        break;
      }
      case fanState.SPEED_1: {
        // Set the speed to 1
        if (this.cacheSpeed !== 'SPEED_1') {
          this.cacheSpeed = 'SPEED_1';
          this.service.updateCharacteristic(this.hapChar.RotationSpeed, 1 * 12.5);

          // Log the change if appropriate
          if (this.enableLogging) {
            this.log('[%s] %s [%s].', this.name, platformLang.curState, this.cacheSpeed);
          }
        }
        break;
      }
      case fanState.SPEED_2: {
        // Set the speed to 2
        if (this.cacheSpeed !== 'SPEED_2') {
          this.cacheSpeed = 'SPEED_2';
          this.service.updateCharacteristic(this.hapChar.RotationSpeed, 2 * 12.5);

          // Log the change if appropriate
          if (this.enableLogging) {
            this.log('[%s] %s [%s].', this.name, platformLang.curState, this.cacheSpeed);
          }
        }
        break;
      }
      case fanState.SPEED_3: {
        // Set the speed to 3
        if (this.cacheSpeed !== 'SPEED_3') {
          this.cacheSpeed = 'SPEED_3';
          this.service.updateCharacteristic(this.hapChar.RotationSpeed, 3 * 12.5);

          // Log the change if appropriate
          if (this.enableLogging) {
            this.log('[%s] %s [%s].', this.name, platformLang.curState, this.cacheSpeed);
          }
        }
        break;
      }
      case fanState.SPEED_4: {
        // Set the speed to 4
        if (this.cacheSpeed !== 'SPEED_4') {
          this.cacheSpeed = 'SPEED_4';
          this.service.updateCharacteristic(this.hapChar.RotationSpeed, 4 * 12.5);

          // Log the change if appropriate
          if (this.enableLogging) {
            this.log('[%s] %s [%s].', this.name, platformLang.curState, this.cacheSpeed);
          }
        }
        break;
      }
      case fanState.SPEED_5: {
        // Set the speed to 5
        if (this.cacheSpeed !== 'SPEED_5') {
          this.cacheSpeed = 'SPEED_5';
          this.service.updateCharacteristic(this.hapChar.RotationSpeed, 5 * 12.5);

          // Log the change if appropriate
          if (this.enableLogging) {
            this.log('[%s] %s [%s].', this.name, platformLang.curState, this.cacheSpeed);
          }
        }
        break;
      }
      case fanState.SPEED_6: {
        // Set the speed to 6
        if (this.cacheSpeed !== 'SPEED_6') {
          this.cacheSpeed = 'SPEED_6';
          this.service.updateCharacteristic(this.hapChar.RotationSpeed, 6 * 12.5);

          // Log the change if appropriate
          if (this.enableLogging) {
            this.log('[%s] %s [%s].', this.name, platformLang.curState, this.cacheSpeed);
          }
        }
        break;
      }
      case fanState.SPEED_7: {
        // Set the speed to 7
        if (this.cacheSpeed !== 'SPEED_7') {
          this.cacheSpeed = 'SPEED_7';
          this.service.updateCharacteristic(this.hapChar.RotationSpeed, 7 * 12.5);

          // Log the change if appropriate
          if (this.enableLogging) {
            this.log('[%s] %s [%s].', this.name, platformLang.curState, this.cacheSpeed);
          }
        }
        break;
      }
      case fanState.SPEED_8: {
        // Set the speed to 8
        if (this.cacheSpeed !== 'SPEED_8') {
          this.cacheSpeed = 'SPEED_8';
          this.service.updateCharacteristic(this.hapChar.RotationSpeed, 8 * 12.5);

          // Log the change if appropriate
          if (this.enableLogging) {
            this.log('[%s] %s [%s].', this.name, platformLang.curState, this.cacheSpeed);
          }
        }
        break;
      }
      case fanState.SWING_ON: {
        // Set the swing to on
        if (this.cacheSwing !== 'SWING_ON') {
          this.cacheSwing = 'SWING_ON';
          this.service.updateCharacteristic(this.hapChar.SwingMode, 1);

          // Log the change if appropriate
          if (this.enableLogging) {
            this.log('[%s] %s [%s].', this.name, platformLang.curState, this.cacheSwing);
          }
        }
        break;
      }
      case fanState.SWING_OFF: {
        // Set the swing to off
        if (this.cacheSwing !== 'SWING_OFF') {
          this.cacheSwing = 'SWING_OFF';
          this.service.updateCharacteristic(this.hapChar.SwingMode, 0);

          // Log the change if appropriate
          if (this.enableLogging) {
            this.log('[%s] %s [%s].', this.name, platformLang.curState, this.cacheSwing);
          }
        }
        break;
      }

      case 'qhAAAAAAAAAAAAAAAAAAAAAAALo=': {
        // Ignore this
        break;
      }

      default: {
        this.log.warn('[%s] New/Unknown scene code received: [%s].', this.name, params.scene);
      }
    }
  }
}

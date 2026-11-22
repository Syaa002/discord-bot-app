const { handleVoiceState } = require('../modules/voiceRooms');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    await handleVoiceState(oldState, newState);
  }
};

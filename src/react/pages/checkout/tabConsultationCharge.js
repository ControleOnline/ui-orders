// A cached config or route marker cannot grant charge permission.
export const getWaiterChargeChannels = order => ({
  enabled: order?.chargeCapability?.enabled === true,
  local: order?.chargeCapability?.enabled === true && order?.chargeCapability?.local === true,
  remote: order?.chargeCapability?.enabled === true && order?.chargeCapability?.remote === true,
});

let screenAwakeUtil = (function() {
  
  let SELF = {
    Toggle,
    Lock,
    Release,
    Configure,
  };
  
  let states = {
    released: 0,
    locked: 1,
    scheduled: 2,
    failed: 3,
  };
  
  let local = {
    wakeLock: null,
    state: states.released,
    isReleased: true,
    isJobScheduled: false,
    onStateChange: null,
    requestQueue: [],
  };
  
  function Configure({onStateChange}) {
    if (typeof(onStateChange) != 'function') return;
    
    local.onStateChange = onStateChange;
  }
  
  function Toggle() {
    if (local.isReleased) {
      Lock();
    } else {
      Release();
    }
    
    runJob_();
    return local.isReleased;
  }
  
  function Release() {
    local.requestQueue.push('release');
    local.isReleased = true;
    runJob_();
  }
  
  function Lock() {
    local.requestQueue.push('lock');
    local.isReleased = false;
    runJob_();
  }
  
  async function scheduleRelease_() {
    await local.wakeLock?.release();
    local.state = states.released;
  }
  
  async function scheduleLock_() {
    if (local.wakeLock) {
      if (!local.wakeLock.released) return;
    }
    
    try {
      local.wakeLock = await navigator.wakeLock.request('screen');
      local.state = states.locked;
    } catch (err) {
      local.state = states.failed;
      console.error(err);
    }
  }
  
  async function runJob_() {
    
    if (local.isJobScheduled) return;
    
    local.isJobScheduled = true;
    local.state = states.scheduled;
    
    while (local.requestQueue.length > 0) {
      let jobName = local.requestQueue.shift();

      if (jobName == 'release') {
        await scheduleRelease_();
      } else if (jobName == 'lock') {
        await scheduleLock_();
      }
    }
    
    local.isJobScheduled = false;

    local.onStateChange?.(local.state);
  }
  
  return SELF;
  
})();

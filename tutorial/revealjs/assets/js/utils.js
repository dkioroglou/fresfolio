let slideTimer = null;
const subtitleDisplay = document.getElementById('subtitle-display');
let audioElements = [];
let subtitleElements = [];
let timedFragments = [];
let videoElements = []; // Add video elements array
const PAUSE_BEFORE_NEXT_SLIDE = 3000;
const pauseResumeBtn = document.getElementById('pause-resume-btn');
let currentAudioIndex = 0;
let isPaused = false;
let currentAudio = null;
let pendingTimer = null;
let pauseStartTime = 0;
let remainingDelay = 0;
let fragmentTimers = [];
let fragmentSchedule = [];
let slideStartTime = 0;

function togglePauseResume() {
    isPaused = !isPaused;
    
    if (isPaused) {
        // Record when we paused
        pauseStartTime = Date.now();
        const elapsedTime = pauseStartTime - slideStartTime;
        
        // Pause current audio
        if (currentAudio && !currentAudio.paused) {
            currentAudio.pause();
        }
        
        // Pause all videos on current slide
        videoElements.forEach((video, index) => {
            if (!video.paused) {
                video.pause();
            }
        });
        
        // Clear pending timer if audio hasn't started yet
        if (pendingTimer) {
            clearTimeout(pendingTimer);
            pendingTimer = null;
        }
        
        // Clear all fragment timers and calculate remaining time
        fragmentTimers.forEach(timer => clearTimeout(timer));
        fragmentTimers = [];
        
        // Update remaining time for each fragment
        fragmentSchedule.forEach(scheduleInfo => {
            if (!scheduleInfo.hasAppeared) {
                scheduleInfo.remainingTime = scheduleInfo.originalTime - elapsedTime;
            }
        });
        
        pauseResumeBtn.textContent = '▶';
        pauseResumeBtn.setAttribute('aria-label', 'Resume');
    } else {
        // Update slide start time to account for pause duration
        const pauseDuration = Date.now() - pauseStartTime;
        slideStartTime += pauseDuration;
        
        // Resume current audio if it was playing
        if (currentAudio && currentAudio.paused && currentAudio.currentTime > 0) {
            currentAudio.play().catch(() => {});
        } else if (currentAudio === null && remainingDelay > 0) {
            // Audio hasn't started yet, reschedule with remaining time
            scheduleCurrentAudio(remainingDelay);
        }
        
        // Resume all videos on current slide
        videoElements.forEach((video, index) => {
            if (video.paused) {
                video.play().catch(err => {});
            }
        });
        
        // Reschedule fragments that haven't appeared yet
        fragmentSchedule.forEach(scheduleInfo => {
            if (!scheduleInfo.hasAppeared && scheduleInfo.remainingTime > 0) {
                const timer = setTimeout(() => {
                    scheduleInfo.fragment.classList.add("visible");
                    scheduleInfo.hasAppeared = true;
                }, scheduleInfo.remainingTime);
                fragmentTimers.push(timer);
            } else if (!scheduleInfo.hasAppeared && scheduleInfo.remainingTime <= 0) {
                // Should have appeared already, show immediately
                scheduleInfo.fragment.classList.add("visible");
                scheduleInfo.hasAppeared = true;
            }
        });
        
        pauseResumeBtn.textContent = '⏸';
        pauseResumeBtn.setAttribute('aria-label', 'Pause');
    }
}

function scheduleCurrentAudio(delay) {
    if (currentAudioIndex >= audioElements.length) {
        // All audios finished, move to next slide
        pendingTimer = setTimeout(() => {
            subtitleDisplay.classList.remove('visible');
            subtitleDisplay.textContent = '';
            Reveal.next();
        }, PAUSE_BEFORE_NEXT_SLIDE);
        return;
    }
    
    const audio = audioElements[currentAudioIndex];
    const subtitle = subtitleElements[currentAudioIndex];
    
    remainingDelay = delay;
    
    pendingTimer = setTimeout(() => {
        pendingTimer = null;
        remainingDelay = 0;
        currentAudio = audio;
        
        // Display subtitle
        if (subtitle) {
            subtitleDisplay.textContent = subtitle.textContent;
            subtitleDisplay.classList.add('visible');
        }
        
        // Play audio only if not paused
        if (!isPaused) {
            audio.play().catch(() => {});
        }
        
        // When audio ends, play next
        audio.onended = () => {
            currentAudioIndex++;
            currentAudio = null;
            playNextAudio();
        };
    }, delay);
}

function playNextAudio() {
    if (currentAudioIndex >= audioElements.length) {
        // All audios finished, move to next slide
        setTimeout(() => {
            subtitleDisplay.classList.remove('visible');
            subtitleDisplay.textContent = '';
            Reveal.next();
        }, PAUSE_BEFORE_NEXT_SLIDE);
        return;
    }
    
    const audio = audioElements[currentAudioIndex];
    const startTime = parseInt(audio.getAttribute('audio-start')) || 0;
    
    scheduleCurrentAudio(startTime);
}

function startAudioForSlide(event) {
    const currentSlide = event.currentSlide;
    audioElements = Array.from(currentSlide.querySelectorAll('.slide-audio'));
    subtitleElements = Array.from(currentSlide.querySelectorAll('.slide-subtitle'));
    timedFragments = Array.from(currentSlide.querySelectorAll('.timed-fragment'));
    
    // Get all video elements - try multiple selectors
    videoElements = Array.from(currentSlide.querySelectorAll('video'));
    
    // Also try getting videos with specific classes if they exist
    const classVideos = Array.from(currentSlide.querySelectorAll('.slide-video, video[class]'));
    classVideos.forEach(v => {
        if (!videoElements.includes(v)) {
            videoElements.push(v);
        }
    });
    
    // Clear any pending timers
    if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
    }
    
    // Clear all fragment timers
    fragmentTimers.forEach(timer => clearTimeout(timer));
    fragmentTimers = [];
    fragmentSchedule = [];
    
    // Stop any currently playing audio
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }
    
    currentAudioIndex = 0;
    isPaused = false;
    currentAudio = null;
    remainingDelay = 0;
    slideStartTime = Date.now();
    
    // Show or hide pause button based on whether there's audio or video
    if (audioElements.length > 0 || videoElements.length > 0) {
        // Reset button state
        pauseResumeBtn.textContent = '⏸';
        pauseResumeBtn.setAttribute('aria-label', 'Pause');
        pauseResumeBtn.style.display = 'flex';
    } else {
        pauseResumeBtn.style.display = 'none';
    }
    
    // Hide all timed fragments on all slides
    document.querySelectorAll('.timed-fragment').forEach(f => {
        f.classList.remove('visible');
    });
    
    // Stop all audio elements
    document.querySelectorAll('.slide-audio').forEach(a => {
        a.pause();
        a.currentTime = 0;
    });
    
    // Stop all video elements globally
    document.querySelectorAll('video').forEach(v => {
        v.pause();
        v.currentTime = 0;
    });
    
    // Hide subtitles
    subtitleDisplay.classList.remove('visible');
    subtitleDisplay.textContent = '';
    
    // If current slide has audio, start playing
    if (audioElements.length > 0) {
        playNextAudio();
    }
    
    // Schedule timed fragments
    if (timedFragments.length > 0) {
        timedFragments.forEach(fragment => {
            const startTime = parseInt(fragment.getAttribute('fragment-start')) || 0;
            
            // Store fragment schedule info
            const scheduleInfo = {
                fragment: fragment,
                originalTime: startTime,
                remainingTime: startTime,
                hasAppeared: false
            };
            fragmentSchedule.push(scheduleInfo);
            
            // Show fragment at start time
            const timer = setTimeout(() => {
                fragment.classList.add("visible");
                scheduleInfo.hasAppeared = true;
            }, startTime);
            fragmentTimers.push(timer);
        });
    }
}

// Pause/Resume button event listener
pauseResumeBtn.addEventListener('click', togglePauseResume);

// Fires on first load
Reveal.on('ready', event => {
    startAudioForSlide(event);
});

// Fires when navigating
Reveal.on('slidechanged', event => {
    startAudioForSlide(event);
});

// Start button
document.getElementById("start-btn").addEventListener("click", () => {
    Reveal.next();
});

/* ============================================
   FIRST ROUND INTERVIEW — JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  const PRESIGN_URL = 'https://n8n-production-f881.up.railway.app/webhook/r2-presign';
  const WEBHOOK_URL = 'https://n8n-production-f881.up.railway.app/webhook/horizon-first-round-interview';

  const form = document.getElementById('interviewForm');
  const successScreen = document.getElementById('successScreen');
  if (!form) return;

  // --- Progress Ring ---
  const progressFill = document.querySelector('.progress-ring-fill');
  const progressText = document.querySelector('.progress-text');
  const circumference = 2 * Math.PI * 19;
  if (progressFill) {
    progressFill.setAttribute('r', '19');
    progressFill.setAttribute('cx', '24');
    progressFill.setAttribute('cy', '24');
    progressFill.setAttribute('stroke-dasharray', circumference);
    progressFill.setAttribute('stroke-dashoffset', circumference);
    const bgCircle = document.querySelector('.progress-ring-bg');
    if (bgCircle) {
      bgCircle.setAttribute('r', '19');
      bgCircle.setAttribute('cx', '24');
      bgCircle.setAttribute('cy', '24');
    }
  }

  function updateProgress() {
    const fields = form.querySelectorAll('input[required], textarea[required]');
    let filled = 0;
    let total = fields.length;
    total += 2;
    if (videoFiles.video1) filled++;
    if (videoFiles.video2) filled++;
    fields.forEach(field => {
      if (field.type === 'radio') {
        const radioGroup = form.querySelector(`input[name="${field.name}"]:checked`);
        if (radioGroup) filled++;
        const radios = form.querySelectorAll(`input[name="${field.name}"][required]`);
        total -= (radios.length - 1);
      } else if (field.value.trim()) {
        filled++;
      }
    });
    const percent = Math.round((filled / total) * 100);
    if (progressFill) {
      const offset = circumference - (percent / 100) * circumference;
      progressFill.setAttribute('stroke-dashoffset', offset);
    }
    if (progressText) {
      progressText.textContent = percent + '%';
    }
  }

  form.addEventListener('input', updateProgress);
  form.addEventListener('change', updateProgress);

  // --- Slider ---
  const slider = document.getElementById('competitive');
  const sliderVal = document.getElementById('sliderVal');
  if (slider && sliderVal) {
    slider.addEventListener('input', () => {
      sliderVal.textContent = slider.value;
    });
  }

  // --- Video Recording & Upload ---
  const videoFiles = { video1: null, video2: null };

  document.querySelectorAll('.video-upload-zone').forEach(zone => {
    const fieldName = zone.dataset.field;
    const controls = zone.querySelector('.video-controls');
    const recordingUI = zone.querySelector('.recording-ui');
    const preview = zone.querySelector('.video-preview');
    const playback = zone.querySelector('.video-playback');
    const recordBtn = zone.querySelector('.btn-record');
    const stopBtn = zone.querySelector('.btn-stop-record');
    const cancelBtn = zone.querySelector('.btn-cancel-record');
    const removeBtn = zone.querySelector('.remove-video');
    const fileInput = zone.querySelector('.file-input');
    const uploadStatus = zone.querySelector('.upload-status');
    const recordingPreview = zone.querySelector('.recording-preview');
    const recTimer = zone.querySelector('.rec-timer');

    let mediaRecorder = null;
    let recordedChunks = [];
    let stream = null;
    let timerInterval = null;
    let startTime = 0;
    let recordingMimeType = '';
    let recordingCanceled = false;

    // Prefer webm where supported; fall back through the chain. iOS Safari
    // only supports mp4 — never hard-code webm or the constructor throws.
    function getSupportedMimeType() {
      const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
      for (const type of types) { if (window.MediaRecorder && MediaRecorder.isTypeSupported(type)) return type; }
      return '';
    }

    if (recordBtn) {
      recordBtn.addEventListener('click', async () => {
        // 1. Camera access — its own try/catch so the error message is accurate.
        try {
          // Constrain to 720p so recorded files are upload-friendly (~4x smaller).
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }, audio: true });
          } catch (constraintErr) {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          }
        } catch (err) {
          alert('Camera access is required to record video. Please allow camera permissions and try again, or use the Upload File option.');
          return;
        }

        // 2. Recorder creation — separate handling. iOS Safari may reject the
        // options object (bitrate caps), so fall back progressively.
        const preferred = getSupportedMimeType();
        const opts = { videoBitsPerSecond: 2500000, audioBitsPerSecond: 128000 };
        if (preferred) opts.mimeType = preferred;
        try {
          mediaRecorder = new MediaRecorder(stream, opts);
        } catch (err) {
          try {
            mediaRecorder = preferred ? new MediaRecorder(stream, { mimeType: preferred }) : new MediaRecorder(stream);
          } catch (err2) {
            try {
              mediaRecorder = new MediaRecorder(stream);
            } catch (err3) {
              stopStream();
              alert('In-browser recording is not supported on this device. Please use the Upload File option instead.');
              return;
            }
          }
        }
        // Store the mimeType the recorder actually used so the file matches it.
        recordingMimeType = mediaRecorder.mimeType || preferred || 'video/webm';
        recordingCanceled = false;

        recordingPreview.srcObject = stream;
        controls.style.display = 'none';
        recordingUI.style.display = 'block';
        recordedChunks = [];
        mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) recordedChunks.push(e.data); };
        mediaRecorder.onstop = () => {
          stopTimer();
          stopStream();
          if (recordingCanceled) {
            recordedChunks = [];
            recordingUI.style.display = 'none';
            controls.style.display = 'flex';
            return;
          }
          const blob = new Blob(recordedChunks, { type: recordingMimeType });
          // Guard against empty/corrupt captures (the iOS failure mode).
          // A real 60-90s clip is several MB; under ~50KB means it didn't record.
          if (blob.size < 51200) {
            recordingUI.style.display = 'none';
            controls.style.display = 'flex';
            alert("That recording didn't capture correctly. Please try again, or use the Upload File option.");
            return;
          }
          const ext = recordingMimeType.includes('webm') ? 'webm' : recordingMimeType.includes('mp4') ? 'mp4' : 'mov';
          const file = new File([blob], fieldName + '-recording.' + ext, { type: recordingMimeType });
          const url = URL.createObjectURL(blob);
          playback.src = url;
          videoFiles[fieldName] = file;
          recordingUI.style.display = 'none';
          preview.style.display = 'block';
          controls.style.display = 'none';
          updateProgress();
        };
        // No timeslice — iOS Safari emits broken/empty fragments when one is set.
        mediaRecorder.start();
        startTimer();
      });
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        // Flag BEFORE stop(): ondataavailable/onstop fire async after stop(),
        // so clearing chunks here alone doesn't actually cancel the recording.
        recordingCanceled = true;
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        } else {
          recordedChunks = [];
          recordingUI.style.display = 'none';
          controls.style.display = 'flex';
          stopTimer();
          stopStream();
        }
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        playback.src = '';
        videoFiles[fieldName] = null;
        preview.style.display = 'none';
        controls.style.display = 'flex';
        updateProgress();
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        handleFileUpload(file, fieldName, zone);
      });
    }

    const dropZone = zone.querySelector('.file-drop-zone');
    if (dropZone) {
      ['dragenter', 'dragover'].forEach(evt => {
        zone.addEventListener(evt, (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
      });
      ['dragleave', 'drop'].forEach(evt => {
        zone.addEventListener(evt, (e) => { e.preventDefault(); zone.classList.remove('drag-over'); });
      });
      zone.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('video/')) handleFileUpload(file, fieldName, zone);
      });
    }

    function handleFileUpload(file, field, zoneEl) {
      const maxSize = 500 * 1024 * 1024;
      if (file.size > maxSize) { alert('File is too large. Maximum size is 500MB.'); return; }
      const ctrl = zoneEl.querySelector('.video-controls');
      const status = zoneEl.querySelector('.upload-status');
      const filename = zoneEl.querySelector('.upload-filename');
      const progressFillBar = zoneEl.querySelector('.upload-progress-fill');
      const prevEl = zoneEl.querySelector('.video-preview');
      const playbackEl = zoneEl.querySelector('.video-playback');
      ctrl.style.display = 'none';
      status.style.display = 'block';
      filename.textContent = file.name + ' (' + (file.size / (1024 * 1024)).toFixed(1) + ' MB)';
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 25 + 10;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setTimeout(() => {
            const url = URL.createObjectURL(file);
            playbackEl.src = url;
            videoFiles[field] = file;
            status.style.display = 'none';
            prevEl.style.display = 'block';
            updateProgress();
          }, 300);
        }
        progressFillBar.style.width = progress + '%';
      }, 200);
    }

    function startTimer() {
      startTime = Date.now();
      timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        recTimer.innerHTML = '<span class="rec-dot"></span> ' + mins + ':' + String(secs).padStart(2, '0');
      }, 1000);
    }

    function stopTimer() { clearInterval(timerInterval); }
    function stopStream() {
      if (stream) { stream.getTracks().forEach(track => track.stop()); stream = null; }
    }
  });

  // --- Form Submission ---
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validation
    let valid = true;
    const required = form.querySelectorAll('[required]');
    form.querySelectorAll('.field-group.error').forEach(fg => fg.classList.remove('error'));
    form.querySelectorAll('.field-error-msg').forEach(msg => msg.remove());

    required.forEach(field => {
      if (field.type === 'radio') {
        const checked = form.querySelector(`input[name="${field.name}"]:checked`);
        if (!checked) {
          valid = false;
          field.closest('.field-group').classList.add('error');
        }
      } else if (!field.value.trim()) {
        valid = false;
        field.closest('.field-group').classList.add('error');
        const msg = document.createElement('div');
        msg.className = 'field-error-msg';
        msg.textContent = 'This field is required';
        field.parentNode.appendChild(msg);
      }
    });

    if (!videoFiles.video1 || !videoFiles.video2) {
      valid = false;
      document.querySelectorAll('.video-question').forEach((vq, i) => {
        const field = i === 0 ? 'video1' : 'video2';
        if (!videoFiles[field]) vq.querySelector('.video-upload-zone').style.borderColor = '#e53e3e';
      });
    }

    if (!valid) {
      const firstError = form.querySelector('.error, [style*="border-color: rgb(229, 62, 62)"]');
      if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Disable submit button
    const submitBtn = form.querySelector('.btn-submit');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting…'; }

    try {
      // Upload videos to R2 via presign — with retry, timeout, progress,
      // and HTTP status checks (a bare fetch() resolves even on 403/500,
      // which previously let failed uploads show the success screen).
      async function uploadVideo(file, fieldKey, label) {
        const ext = file.name ? file.name.split('.').pop() : 'webm';
        const MAX_ATTEMPTS = 3;
        let presign = null, lastErr = null;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          try {
            if (!presign) {
              const presignRes = await fetch(PRESIGN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: `${fieldKey}-${Date.now()}.${ext}`, fileType: file.type || 'video/webm' })
              });
              if (!presignRes.ok) throw new Error('presign_' + presignRes.status);
              presign = await presignRes.json();
              if (!presign || !presign.uploadUrl) throw new Error('presign_no_url');
            }

            const url = await new Promise((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.open('PUT', presign.uploadUrl);
              xhr.setRequestHeader('Content-Type', file.type || 'video/webm');
              xhr.timeout = 180000;
              xhr.upload.onprogress = (e) => {
                if (e.lengthComputable && submitBtn) {
                  const pct = Math.round((e.loaded / e.total) * 100);
                  submitBtn.textContent = 'Uploading ' + label + '… ' + pct + '%';
                }
              };
              xhr.onload = () => {
                if (xhr.status === 200 || xhr.status === 204) resolve(presign.publicUrl);
                else reject(new Error('put_' + xhr.status));
              };
              xhr.onerror = () => reject(new Error('network_error'));
              xhr.ontimeout = () => reject(new Error('timeout'));
              xhr.send(file);
            });
            return url;
          } catch (err) {
            lastErr = err;
            if (String(err.message || '').indexOf('presign') === 0) presign = null;
            if (attempt < MAX_ATTEMPTS) {
              if (submitBtn) submitBtn.textContent = 'Retrying ' + label + '… (' + (attempt + 1) + ')';
              await new Promise(r => setTimeout(r, attempt * 1200));
            }
          }
        }
        throw lastErr || new Error('upload_failed');
      }

      // Sequential so the progress text on the button is meaningful.
      const video1Url = await uploadVideo(videoFiles.video1, 'video1', 'video 1 of 2');
      const video2Url = await uploadVideo(videoFiles.video2, 'video2', 'video 2 of 2');

      if (submitBtn) submitBtn.textContent = 'Submitting…';

      // Post form data to n8n
      const webhookRes = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName.value,
          phone: form.phone.value,
          email: form.email.value,
          aboutYou: form.aboutYou.value,
          teamActivity: form.teamActivity.value,
          highAchiever: form.highAchiever.value,
          selfDev: form.selfDev.value,
          valuesRank: form.valuesRank.value,
          competitive: form.competitive.value,
          transportation: form.querySelector('input[name="transportation"]:checked')?.value,
          startDate: form.startDate.value,
          video1Url,
          video2Url,
          ...window.HorizonForms.smsConsentFields(form)
        })
      });
      if (!webhookRes.ok) throw new Error('webhook_' + webhookRes.status);

      // Show success
      form.style.display = 'none';
      document.querySelector('.progress-wrapper').style.display = 'none';
      successScreen.style.display = 'block';
      successScreen.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
      console.error('Submission error:', err);
      alert('Something went wrong submitting your application (' + (err && err.message ? err.message : 'unknown') + '). Please check your connection and try again, or email your responses to contact@horizonsalesolutions.com');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Application →'; }
    }
  });

  updateProgress();
});

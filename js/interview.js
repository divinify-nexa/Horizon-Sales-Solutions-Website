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

    if (recordBtn) {
      recordBtn.addEventListener('click', async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          recordingPreview.srcObject = stream;
          controls.style.display = 'none';
          recordingUI.style.display = 'block';
          recordedChunks = [];
          mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
          mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data); };
          mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            playback.src = url;
            videoFiles[fieldName] = blob;
            recordingUI.style.display = 'none';
            preview.style.display = 'block';
            controls.style.display = 'none';
            stopTimer();
            stopStream();
            updateProgress();
          };
          mediaRecorder.start();
          startTimer();
        } catch (err) {
          alert('Camera access is required to record video. Please allow camera permissions and try again.');
        }
      });
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
        recordedChunks = [];
        recordingUI.style.display = 'none';
        controls.style.display = 'flex';
        stopTimer();
        stopStream();
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
      // Upload videos to R2 via presign
      async function uploadVideo(file, fieldKey) {
        const ext = file.name ? file.name.split('.').pop() : 'webm';
        const presignRes = await fetch(PRESIGN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: `${fieldKey}-${Date.now()}.${ext}`, fileType: file.type || 'video/webm' })
        });
        const { uploadUrl, publicUrl } = await presignRes.json();
        await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'video/webm' },
          body: file
        });
        return publicUrl;
      }

      const [video1Url, video2Url] = await Promise.all([
        uploadVideo(videoFiles.video1, 'video1'),
        uploadVideo(videoFiles.video2, 'video2')
      ]);

      // Post form data to n8n
      await fetch(WEBHOOK_URL, {
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
          video2Url
        })
      });

      // Show success
      form.style.display = 'none';
      document.querySelector('.progress-wrapper').style.display = 'none';
      successScreen.style.display = 'block';
      successScreen.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
      console.error('Submission error:', err);
      alert('Something went wrong submitting your application. Please try again.');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Application →'; }
    }
  });

  updateProgress();
});

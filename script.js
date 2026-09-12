// สัดส่วนเริ่มต้นการทำงานของเอฟเฟกต์ภาพและแอนิเมชัน
document.addEventListener("DOMContentLoaded", function() {
    if (typeof AOS !== 'undefined') {
        AOS.init({ once: true, duration: 800 });
    }
    initInteractiveBg();
    init3DTilt();
});

// สัดส่วนการทำงานของพื้นหลังโต้ตอบกับตำแหน่งเมาส์
function initInteractiveBg() {
    const orb1 = document.querySelector('.orb-1');
    const orb2 = document.querySelector('.orb-2');
    
    window.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 60;
        const y = (e.clientY / window.innerHeight - 0.5) * 60;
        if (orb1) orb1.style.transform = `translate(${x}px, ${y}px)`;
        if (orb2) orb2.style.transform = `translate(${-x}px, ${-y}px)`;
    });
}

// สัดส่วนการทำงานของการ์ดแบบ 3D Tilt
function init3DTilt() {
    const cards = document.querySelectorAll('.tilt-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            const tiltX = (y / (rect.height / 2)) * -3.5;
            const tiltY = (x / (rect.width / 2)) * 3.5;
            card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-3px)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
        });
    });
}

// สัดส่วนการควบคุมแท็บสลับหน้าจอ
const tabTrainBtn = document.getElementById('tabTrainBtn');
const tabTestBtn = document.getElementById('tabTestBtn');
const trainSection = document.getElementById('trainSection');
const testSection = document.getElementById('testSection');

tabTrainBtn.addEventListener('click', () => {
    tabTrainBtn.classList.add('active');
    tabTestBtn.classList.remove('active');
    trainSection.style.display = 'block';
    testSection.style.display = 'none';
});

tabTestBtn.addEventListener('click', () => {
    tabTestBtn.classList.add('active');
    tabTrainBtn.classList.remove('active');
    testSection.style.display = 'block';
    trainSection.style.display = 'none';
});

// สัดส่วนการเตรียมข้อมูลและแคนวาสสำหรับคำนวณสี
const hiddenCanvas = document.getElementById('hiddenCanvas');
const ctx = hiddenCanvas.getContext('2d');

let trainingDataset = [];
let tempBeforeFiles = [];
let tempAfterFiles = [];
let tempTestFiles = [];

const formulaNames = {
    formula1: 'สูตร 1: กะหล่ำปลีม่วงล้วน',
    formula2: 'สูตร 2: น้ำสะอาด + กะหล่ำปลีม่วง',
    formula3: 'สูตร 3: เบกกิ้งโซดา + กะหล่ำปลีม่วง',
    formula4: 'สูตร 4: น้ำส้มสายชู + กะหล่ำปลีม่วง'
};

const classNames = {
    low: 'เปลี่ยนน้อย (Low)',
    medium: 'เปลี่ยนปานกลาง (Med)',
    high: 'เปลี่ยนมาก (High)'
};

// สัดส่วนฟังก์ชันคณิตศาสตร์แปลงค่าสี RGB เป็น HSV
function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let h = 0;
    let s = max === 0 ? 0 : diff / max;
    let v = max;

    if (diff !== 0) {
        if (max === r) h = ((g - b) / diff) % 6;
        else if (max === g) h = (b - r) / diff + 2;
        else h = (r - g) / diff + 4;
        h = Math.round(h * 60);
        if (h < 0) h += 360;
    }
    return { h, s: Math.round(s * 100), v: Math.round(v * 100) };
}

// สัดส่วนการสกัดสีเฉลี่ยจากกึ่งกลางภาพฉลาก (ROI 50%)
function extractColorFromImage(imgElement) {
    hiddenCanvas.width = imgElement.naturalWidth || imgElement.width;
    hiddenCanvas.height = imgElement.naturalHeight || imgElement.height;
    ctx.drawImage(imgElement, 0, 0);

    const roiW = Math.floor(hiddenCanvas.width * 0.5);
    const roiH = Math.floor(hiddenCanvas.height * 0.5);
    const startX = Math.floor((hiddenCanvas.width - roiW) / 2);
    const startY = Math.floor((hiddenCanvas.height - roiH) / 2);

    const imgData = ctx.getImageData(startX, startY, roiW, roiH).data;
    let totalR = 0, totalG = 0, totalB = 0;
    const count = imgData.length / 4;

    for (let i = 0; i < imgData.length; i += 4) {
        totalR += imgData[i];
        totalG += imgData[i + 1];
        totalB += imgData[i + 2];
    }

    const r = Math.round(totalR / count);
    const g = Math.round(totalG / count);
    const b = Math.round(totalB / count);
    const hsv = rgbToHsv(r, g, b);

    return { r, g, b, ...hsv };
}

// สัดส่วนการคำนวณเวกเตอร์ความแตกต่างระหว่างสี
function calculateColorDifference(c1, c2) {
    let diffHue = Math.abs(c1.h - c2.h);
    if (diffHue > 180) diffHue = 360 - diffHue;

    const diffRGB = Math.sqrt((c1.r - c2.r) ** 2 + (c1.g - c2.g) ** 2 + (c1.b - c2.b) ** 2);
    return { diffHue, diffRGB };
}

// สัดส่วนการจัดการนำเข้าข้อมูลภาพฝึก AI
const trainFormula = document.getElementById('trainFormula');
const trainGroundTruth = document.getElementById('trainGroundTruth');
const trainBeforeInput = document.getElementById('trainBeforeInput');
const trainAfterInput = document.getElementById('trainAfterInput');
const beforePreviewGrid = document.getElementById('beforePreviewGrid');
const afterPreviewGrid = document.getElementById('afterPreviewGrid');
const startTrainPairBtn = document.getElementById('startTrainPairBtn');

const countLow = document.getElementById('countLow');
const countMedium = document.getElementById('countMedium');
const countHigh = document.getElementById('countHigh');

trainBeforeInput.addEventListener('change', function(e) {
    tempBeforeFiles = Array.from(e.target.files);
    renderThumbnails(tempBeforeFiles, beforePreviewGrid);
    checkTrainReady();
});

trainAfterInput.addEventListener('change', function(e) {
    tempAfterFiles = Array.from(e.target.files);
    renderThumbnails(tempAfterFiles, afterPreviewGrid);
    checkTrainReady();
});

function checkTrainReady() {
    if (tempBeforeFiles.length > 0 && tempAfterFiles.length > 0) {
        startTrainPairBtn.disabled = false;
        const pairCount = Math.min(tempBeforeFiles.length, tempAfterFiles.length);
        startTrainPairBtn.querySelector('.btn-cta-text').textContent = `⚡ สกัดผลต่างสี (ΔColor) และฝึก AI (${pairCount} คู่ภาพ)`;
    } else {
        startTrainPairBtn.disabled = true;
    }
}

function renderThumbnails(files, container) {
    container.innerHTML = '';
    files.forEach((file, idx) => {
        const reader = new FileReader();
        reader.onload = function(evt) {
            const item = document.createElement('div');
            item.className = 'cyber-thumb-item';
            item.innerHTML = `
                <img src="${evt.target.result}" alt="thumb">
                <span class="thumb-idx">#${idx + 1}</span>
            `;
            container.appendChild(item);
        };
        reader.readAsDataURL(file);
    });
}

function loadImageAsync(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(evt) {
            const img = new Image();
            img.onload = () => resolve({ img, src: evt.target.result });
            img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
    });
}

startTrainPairBtn.addEventListener('click', async function() {
    startTrainPairBtn.disabled = true;
    startTrainPairBtn.querySelector('.btn-cta-text').textContent = '⏳ กำลังคำนวณเวกเตอร์พิกเซลและฝึก AI...';

    const formula = trainFormula.value;
    const label = trainGroundTruth.value;
    const pairCount = Math.min(tempBeforeFiles.length, tempAfterFiles.length);

    for (let i = 0; i < pairCount; i++) {
        const beforeData = await loadImageAsync(tempBeforeFiles[i]);
        const afterData = await loadImageAsync(tempAfterFiles[i]);

        const beforeColor = extractColorFromImage(beforeData.img);
        const afterColor = extractColorFromImage(afterData.img);
        const diff = calculateColorDifference(beforeColor, afterColor);

        trainingDataset.push({
            formula,
            beforeColor,
            afterColor,
            deltaHue: diff.diffHue,
            deltaRGB: diff.diffRGB,
            label
        });
    }

    updateStatsDisplay();

    beforePreviewGrid.innerHTML = '';
    afterPreviewGrid.innerHTML = '';
    trainBeforeInput.value = '';
    trainAfterInput.value = '';
    tempBeforeFiles = [];
    tempAfterFiles = [];

    startTrainPairBtn.querySelector('.btn-cta-text').textContent = '✅ บันทึกคู่ภาพเข้าสู่โครงข่ายสำเร็จ!';
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 85,
            spread: 80,
            origin: { y: 0.7 },
            colors: ['#d500f9', '#00e5ff', '#00e676']
        });
    }

    setTimeout(() => {
        startTrainPairBtn.querySelector('.btn-cta-text').textContent = '⚡ สกัดเวกเตอร์ผลต่างสี (ΔColor) และฝึก AI';
    }, 2200);
});

function updateStatsDisplay() {
    const cLow = trainingDataset.filter(d => d.label === 'low').length;
    const cMed = trainingDataset.filter(d => d.label === 'medium').length;
    const cHigh = trainingDataset.filter(d => d.label === 'high').length;

    countLow.textContent = `${cLow} คู่`;
    countMedium.textContent = `${cMed} คู่`;
    countHigh.textContent = `${cHigh} คู่`;
}

// สัดส่วนโมเดลการเรียนรู้ของเครื่อง k-NN
function predictLabelKNN(testColor, testFormula, k = 3) {
    let candidates = trainingDataset.filter(d => d.formula === testFormula);
    if (candidates.length === 0) candidates = trainingDataset;

    if (candidates.length === 0) {
        const h = testColor.h;
        if (h >= 240 && h <= 320) return 'low';
        if (h >= 150 && h < 240) return 'medium';
        return 'high';
    }

    const distances = candidates.map(item => {
        let diffH = Math.abs(testColor.h - item.afterColor.h);
        if (diffH > 180) diffH = 360 - diffH;

        const diffR = testColor.r - item.afterColor.r;
        const diffG = testColor.g - item.afterColor.g;
        const diffB = testColor.b - item.afterColor.b;

        const dist = Math.sqrt((diffH * 2.2) ** 2 + diffR ** 2 + diffG ** 2 + diffB ** 2);
        return { label: item.label, dist };
    });

    distances.sort((a, b) => a.dist - b.dist);
    const topK = distances.slice(0, Math.min(k, distances.length));

    const votes = { low: 0, medium: 0, high: 0 };
    topK.forEach(item => votes[item.label]++);

    return Object.keys(votes).reduce((a, b) => votes[a] > votes[b] ? a : b);
}

// สัดส่วนการทดสอบชุดภาพใหม่และการคำนวณความถูกต้อง
const testFormula = document.getElementById('testFormula');
const testActualClass = document.getElementById('testActualClass');
const testImagesInput = document.getElementById('testImagesInput');
const testPreviewArea = document.getElementById('testPreviewArea');
const startPredictBtn = document.getElementById('startPredictBtn');

const evaluationSummaryCard = document.getElementById('evaluationSummaryCard');
const accuracyPercent = document.getElementById('accuracyPercent');
const accuracyCircleProgress = document.getElementById('accuracyCircleProgress');
const totalTested = document.getElementById('totalTested');
const correctPredicted = document.getElementById('correctPredicted');
const incorrectPredicted = document.getElementById('incorrectPredicted');

const testTableWrapper = document.getElementById('testTableWrapper');
const testResultsTableBody = document.getElementById('testResultsTableBody');

testImagesInput.addEventListener('change', function(e) {
    tempTestFiles = Array.from(e.target.files);
    if (tempTestFiles.length > 0) {
        testPreviewArea.style.display = 'grid';
        renderThumbnails(tempTestFiles, testPreviewArea);
        startPredictBtn.disabled = false;
        startPredictBtn.querySelector('.btn-cta-text').textContent = `🔍 ให้ AI จำแนกภาพชุดนี้ (${tempTestFiles.length} ภาพ)`;
    }
});

startPredictBtn.addEventListener('click', async function() {
    startPredictBtn.disabled = true;
    startPredictBtn.querySelector('.btn-cta-text').textContent = '⏳ AI กำลังสแกนโครงสร้างสีและจำแนกข้อมูล...';

    const formula = testFormula.value;
    const actual = testActualClass.value;
    const results = [];
    testResultsTableBody.innerHTML = '';

    for (let i = 0; i < tempTestFiles.length; i++) {
        const fileData = await loadImageAsync(tempTestFiles[i]);
        const color = extractColorFromImage(fileData.img);
        const predicted = predictLabelKNN(color, formula);
        const isCorrect = (predicted === actual);

        results.push({
            index: i + 1,
            src: fileData.src,
            formula: formulaNames[formula],
            color,
            actual,
            predicted,
            isCorrect
        });
    }

    results.forEach(res => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="ลำดับ"><strong>#${res.index}</strong></td>
            <td data-label="รูปฉลาก"><img src="${res.src}" class="result-thumb" alt="test"></td>
            <td data-label="สูตรทดสอบ">${res.formula}</td>
            <td data-label="ค่าสี RGB">
                <span class="table-color-dot" style="background: rgb(${res.color.r}, ${res.color.g}, ${res.color.b}); color: rgb(${res.color.r}, ${res.color.g}, ${res.color.b});"></span>
                <strong>${res.color.r}, ${res.color.g}, ${res.color.b}</strong>
            </td>
            <td data-label="ค่า Hue"><strong>${res.color.h}°</strong></td>
            <td data-label="ระดับจริง">${classNames[res.actual]}</td>
            <td data-label="AI จำแนกได้"><strong style="color: var(--accent-cyan);">${classNames[res.predicted]}</strong></td>
            <td data-label="ผลการตรวจสอบ">
                ${res.isCorrect 
                    ? '<span class="badge-match">✓ ถูกต้อง</span>' 
                    : '<span class="badge-mismatch">✗ คลาดเคลื่อน</span>'}
            </td>
        `;
        testResultsTableBody.appendChild(tr);
    });

    const total = results.length;
    const correct = results.filter(r => r.isCorrect).length;
    const incorrect = total - correct;
    const acc = Math.round((correct / total) * 100);

    // อนิเมชันตัวเลข Accuracy
    animateCounter(accuracyPercent, 0, acc, 1200);
    accuracyCircleProgress.setAttribute('stroke-dasharray', `${acc}, 100`);

    totalTested.textContent = `${total} ภาพ`;
    correctPredicted.textContent = `${correct} ภาพ`;
    incorrectPredicted.textContent = `${incorrect} ภาพ`;

    evaluationSummaryCard.style.display = 'block';
    testTableWrapper.style.display = 'block';

    if (acc >= 70 && typeof confetti === 'function') {
        confetti({
            particleCount: 120,
            spread: 90,
            origin: { y: 0.6 },
            colors: ['#00e5ff', '#d500f9', '#00e676', '#ffffff']
        });
    }

    startPredictBtn.disabled = false;
    startPredictBtn.querySelector('.btn-cta-text').textContent = '🔍 สั่งการ AI จำแนกระดับสีและประเมินผลลัพธ์';
    evaluationSummaryCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// สัดส่วนตัวเลขอเนิเมชันแบบนับขึ้น
function animateCounter(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        element.textContent = `${Math.floor(progress * (end - start) + start)}%`;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}
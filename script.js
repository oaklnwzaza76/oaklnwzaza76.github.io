// script.js

document.addEventListener("DOMContentLoaded", function() {
    if (typeof AOS !== 'undefined') {
        AOS.init({ once: true, duration: 800 });
    }
});

// เมนูสลับแท็บ
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

// การจัดการสีและ Canvas
const hiddenCanvas = document.getElementById('hiddenCanvas');
const ctx = hiddenCanvas.getContext('2d');

let trainingDataset = []; // เก็บ { formula, beforeColor, afterColor, deltaHue, deltaRGB, label }
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
    low: 'เปลี่ยนน้อย',
    medium: 'เปลี่ยนปานกลาง',
    high: 'เปลี่ยนมาก'
};

// เครื่องมือคำนวณสี RGB -> HSV
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

// สกัดสีเฉลี่ยจากองค์ประกอบภาพ
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

// คำนวณความแตกต่างระหว่าง 2 สี (Delta Color)
function calculateColorDifference(c1, c2) {
    let diffHue = Math.abs(c1.h - c2.h);
    if (diffHue > 180) diffHue = 360 - diffHue;

    const diffRGB = Math.sqrt((c1.r - c2.r) ** 2 + (c1.g - c2.g) ** 2 + (c1.b - c2.b) ** 2);
    return { diffHue, diffRGB };
}

// ----------------------------------------------------
// 1. นำเข้าภาพฝึก AI (ก่อนและหลังทดลอง)
// ----------------------------------------------------
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
        startTrainPairBtn.textContent = `⚡ สกัดผลต่างสี (ΔColor) และฝึก AI (${pairCount} คู่ภาพ)`;
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
            item.className = 'batch-thumb-item';
            item.innerHTML = `
                <img src="${evt.target.result}" alt="thumb">
                <span class="thumb-badge">#${idx + 1}</span>
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
    startTrainPairBtn.textContent = '⏳ กำลังประมวลผลจับคู่สีและบันทึกเข้าฐานข้อมูล...';

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

    startTrainPairBtn.textContent = '✅ บันทึกคู่ภาพเข้าฐานข้อมูลฝึกสอนสำเร็จ!';
    if (typeof confetti === 'function') {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }

    setTimeout(() => {
        startTrainPairBtn.textContent = '⚡ ประมวลผลผลต่างสี (ΔColor) และฝึกระบบ AI';
    }, 2000);
});

function updateStatsDisplay() {
    const cLow = trainingDataset.filter(d => d.label === 'low').length;
    const cMed = trainingDataset.filter(d => d.label === 'medium').length;
    const cHigh = trainingDataset.filter(d => d.label === 'high').length;

    countLow.textContent = `${cLow} คู่ภาพ`;
    countMedium.textContent = `${cMed} คู่ภาพ`;
    countHigh.textContent = `${cHigh} คู่ภาพ`;
}

// ----------------------------------------------------
// 2. ระบบ AI จำแนกภาพใหม่ (k-NN Classifier)
// ----------------------------------------------------
function predictLabelKNN(testColor, testFormula, k = 3) {
    // กรองชุดข้อมูลที่ตรงตามสูตรเพื่อความแม่นยำสูงขึ้น (หรือรวมทั้งหมดหากสูตรนั้นยังไม่มี)
    let candidates = trainingDataset.filter(d => d.formula === testFormula);
    if (candidates.length === 0) candidates = trainingDataset;

    // หากยังไม่มีข้อมูลในฐาน ให้ใช้กฎมาตรฐานทางวิทยาศาสตร์ของกะหล่ำปลีม่วง
    if (candidates.length === 0) {
        const h = testColor.h;
        if (h >= 240 && h <= 320) return 'low';       // คงสภาพสีม่วง
        if (h >= 150 && h < 240) return 'medium';     // เริ่มเป็นน้ำเงิน/ฟ้า
        return 'high';                                // เปลี่ยนเป็นเขียว หรือแดงชัดเจน
    }

    // คำนวณระยะห่างสี (Euclidean Distance) กับชุดภาพหลังทดลองในฐานข้อมูล
    const distances = candidates.map(item => {
        let diffH = Math.abs(testColor.h - item.afterColor.h);
        if (diffH > 180) diffH = 360 - diffH;

        const diffR = testColor.r - item.afterColor.r;
        const diffG = testColor.g - item.afterColor.g;
        const diffB = testColor.b - item.afterColor.b;

        const dist = Math.sqrt((diffH * 2) ** 2 + diffR ** 2 + diffG ** 2 + diffB ** 2);
        return { label: item.label, dist };
    });

    distances.sort((a, b) => a.dist - b.dist);
    const topK = distances.slice(0, Math.min(k, distances.length));

    const votes = { low: 0, medium: 0, high: 0 };
    topK.forEach(item => votes[item.label]++);

    return Object.keys(votes).reduce((a, b) => votes[a] > votes[b] ? a : b);
}

// ----------------------------------------------------
// 3. ทดสอบภาพฉลากใหม่หลายรูป & ประเมินความถูกต้อง
// ----------------------------------------------------
const testFormula = document.getElementById('testFormula');
const testActualClass = document.getElementById('testActualClass');
const testImagesInput = document.getElementById('testImagesInput');
const testPreviewArea = document.getElementById('testPreviewArea');
const startPredictBtn = document.getElementById('startPredictBtn');

const evaluationSummaryCard = document.getElementById('evaluationSummaryCard');
const accuracyPercent = document.getElementById('accuracyPercent');
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
        startPredictBtn.textContent = `🔍 ให้ AI จำแนกภาพชุดนี้ (${tempTestFiles.length} ภาพ)`;
    }
});

startPredictBtn.addEventListener('click', async function() {
    startPredictBtn.disabled = true;
    startPredictBtn.textContent = '⏳ AI กำลังสกัดค่าสีและจำแนกระดับการเปลี่ยนแปลง...';

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

    // แสดงรายละเอียดรายภาพในตาราง
    results.forEach(res => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>#${res.index}</strong></td>
            <td><img src="${res.src}" class="result-thumb" alt="test"></td>
            <td>${res.formula}</td>
            <td>
                <span class="table-color-dot" style="background: rgb(${res.color.r}, ${res.color.g}, ${res.color.b});"></span>
                ${res.color.r}, ${res.color.g}, ${res.color.b}
            </td>
            <td>${res.color.h}°</td>
            <td>${classNames[res.actual]}</td>
            <td><strong>${classNames[res.predicted]}</strong></td>
            <td>
                ${res.isCorrect 
                    ? '<span class="match-badge">✓ ถูกต้อง</span>' 
                    : '<span class="mismatch-badge">✗ คลาดเคลื่อน</span>'}
            </td>
        `;
        testResultsTableBody.appendChild(tr);
    });

    // คำนวณความแม่นยำของระบบ (Accuracy Score)
    const total = results.length;
    const correct = results.filter(r => r.isCorrect).length;
    const incorrect = total - correct;
    const acc = Math.round((correct / total) * 100);

    accuracyPercent.textContent = `${acc}%`;
    totalTested.textContent = `${total} ภาพ`;
    correctPredicted.textContent = `${correct} ภาพ`;
    incorrectPredicted.textContent = `${incorrect} ภาพ`;

    evaluationSummaryCard.style.display = 'block';
    testTableWrapper.style.display = 'block';

    if (acc >= 75 && typeof confetti === 'function') {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
    }

    startPredictBtn.disabled = false;
    startPredictBtn.textContent = '🔍 ให้ AI จำแนกระดับสีและประเมินความถูกต้อง (Classify Batch)';
    evaluationSummaryCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
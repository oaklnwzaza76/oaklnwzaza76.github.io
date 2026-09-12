// script.js

document.addEventListener("DOMContentLoaded", function() {
    if (typeof AOS !== 'undefined') {
        AOS.init({ once: true, duration: 800 });
    }
});

// การสลับแท็บ
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

// ตัวแปรและชุดข้อมูล AI
const hiddenCanvas = document.getElementById('hiddenCanvas');
const ctx = hiddenCanvas.getContext('2d');

let trainingDataset = []; // เก็บ { r, g, b, h, s, v, label }
let tempTrainFiles = [];
let tempTestFiles = [];

const classNames = {
    low: 'เปลี่ยนน้อย (ม่วง)',
    medium: 'เปลี่ยนปานกลาง (น้ำเงิน/ฟ้า)',
    high: 'เปลี่ยนมาก (เขียว/ชมพูเข้ม)'
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

// สกัดค่าเฉลี่ยสีจากองค์ประกอบรูปภาพ
function extractColorFromImage(imgElement) {
    hiddenCanvas.width = imgElement.naturalWidth || imgElement.width;
    hiddenCanvas.height = imgElement.naturalHeight || imgElement.height;
    ctx.drawImage(imgElement, 0, 0);

    // คำนวณเฉพาะบริเวณกึ่งกลางภาพ (ROI 50% ตรงกลาง) เพื่อตัดขอบและพื้นหลัง
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

// ----------------------------------------------------
// ส่วนที่ 1: จัดการภาพชุดฝึกสอน (Training Phase)
// ----------------------------------------------------
const trainImagesInput = document.getElementById('trainImagesInput');
const trainClassLabel = document.getElementById('trainClassLabel');
const trainPreviewArea = document.getElementById('trainPreviewArea');
const startTrainBtn = document.getElementById('startTrainBtn');

const countLow = document.getElementById('countLow');
const countMedium = document.getElementById('countMedium');
const countHigh = document.getElementById('countHigh');

trainImagesInput.addEventListener('change', function(e) {
    tempTrainFiles = Array.from(e.target.files);
    if (tempTrainFiles.length > 0) {
        renderThumbnails(tempTrainFiles, trainPreviewArea);
        startTrainBtn.disabled = false;
        startTrainBtn.textContent = `⚡ สกัดสีและฝึกระบบด้วยภาพชุดนี้ (${tempTrainFiles.length} ภาพ)`;
    }
});

function renderThumbnails(files, container) {
    container.innerHTML = '';
    container.style.display = 'grid';

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

startTrainBtn.addEventListener('click', async function() {
    startTrainBtn.disabled = true;
    startTrainBtn.textContent = '⏳ กำลังสกัดค่าสี RGB/HSV เข้าฐานข้อมูล...';

    const selectedClass = trainClassLabel.value;

    for (let file of tempTrainFiles) {
        await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function(evt) {
                const img = new Image();
                img.onload = function() {
                    const color = extractColorFromImage(img);
                    trainingDataset.push({
                        ...color,
                        label: selectedClass
                    });
                    resolve();
                };
                img.src = evt.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    updateStatsDisplay();
    trainPreviewArea.innerHTML = '';
    trainPreviewArea.style.display = 'none';
    trainImagesInput.value = '';
    tempTrainFiles = [];
    startTrainBtn.textContent = '✅ บันทึกเข้าสู่ฐานข้อมูลฝึกสอนสำเร็จ!';

    if (typeof confetti === 'function') {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }

    setTimeout(() => {
        startTrainBtn.textContent = '⚡ ประมวลผลสกัดสีและฝึกระบบ AI (Train Dataset)';
    }, 2000);
});

function updateStatsDisplay() {
    const cLow = trainingDataset.filter(d => d.label === 'low').length;
    const cMed = trainingDataset.filter(d => d.label === 'medium').length;
    const cHigh = trainingDataset.filter(d => d.label === 'high').length;

    countLow.textContent = `${cLow} ภาพ`;
    countMedium.textContent = `${cMed} ภาพ`;
    countHigh.textContent = `${cHigh} ภาพ`;
}

// ----------------------------------------------------
// อัลกอริทึมจำแนก k-NN (k-Nearest Neighbors) จากเวกเตอร์สี
// ----------------------------------------------------
function predictLabelKNN(testSample, k = 3) {
    if (trainingDataset.length === 0) {
        // หากยังไม่มีภาพฝึกสอน ให้ใช้กฎช่วงสี (Rule-based Fallback)
        const h = testSample.h;
        if (h >= 240 && h <= 320) return 'low';
        if (h >= 140 && h < 240) return 'medium';
        return 'high';
    }

    // คำนวณระยะห่างสี (Euclidean Distance บน Hue และ Normalized RGB)
    const distances = trainingDataset.map(trainSample => {
        // คำนวณความต่างของมุม Hue (วงกลม 360 องศา)
        let diffH = Math.abs(testSample.h - trainSample.h);
        if (diffH > 180) diffH = 360 - diffH;

        const diffR = testSample.r - trainSample.r;
        const diffG = testSample.g - trainSample.g;
        const diffB = testSample.b - trainSample.b;

        // ถ่วงน้ำหนัก Hue เป็นหลักร่วมกับค่าความสว่างสี
        const dist = Math.sqrt((diffH * 2) ** 2 + diffR ** 2 + diffG ** 2 + diffB ** 2);
        return { label: trainSample.label, dist };
    });

    distances.sort((a, b) => a.dist - b.dist);
    const topK = distances.slice(0, Math.min(k, distances.length));

    // โหวตหาเสียงข้างมาก
    const votes = { low: 0, medium: 0, high: 0 };
    topK.forEach(item => votes[item.label]++);

    return Object.keys(votes).reduce((a, b) => votes[a] > votes[b] ? a : b);
}

// ----------------------------------------------------
// ส่วนที่ 2: จัดการภาพชุดทดสอบ (Testing & Evaluation)
// ----------------------------------------------------
const testImagesInput = document.getElementById('testImagesInput');
const testActualClass = document.getElementById('testActualClass');
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
        renderThumbnails(tempTestFiles, testPreviewArea);
        startPredictBtn.disabled = false;
        startPredictBtn.textContent = `🔍 ให้ AI จำแนกภาพชุดนี้ (${tempTestFiles.length} ภาพ)`;
    }
});

startPredictBtn.addEventListener('click', async function() {
    startPredictBtn.disabled = true;
    startPredictBtn.textContent = '⏳ AI กำลังวิเคราะห์และเปรียบเทียบระดับสี...';

    const actualClass = testActualClass.value;
    const results = [];
    testResultsTableBody.innerHTML = '';

    for (let i = 0; i < tempTestFiles.length; i++) {
        const file = tempTestFiles[i];
        await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function(evt) {
                const img = new Image();
                img.onload = function() {
                    const color = extractColorFromImage(img);
                    const predicted = predictLabelKNN(color);
                    const isCorrect = (predicted === actualClass);

                    results.push({
                        index: i + 1,
                        src: evt.target.result,
                        color,
                        actual: actualClass,
                        predicted,
                        isCorrect
                    });
                    resolve();
                };
                img.src = evt.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // แสดงรายละเอียดลงในตาราง
    results.forEach(res => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>#${res.index}</strong></td>
            <td><img src="${res.src}" class="result-thumb" alt="test"></td>
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

    // คำนวณความถูกต้องภาพรวม
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
    startPredictBtn.textContent = '🔍 ให้ AI จำแนกภาพทั้งหมดและเปรียบเทียบผล (Batch Classify)';
    
    evaluationSummaryCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
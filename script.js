// script.js

document.addEventListener("DOMContentLoaded", function() {
    if (typeof AOS !== 'undefined') {
        AOS.init({
            once: true,
            duration: 800
        });
    }
});

const imageInput = document.getElementById('imageInput');
const previewImage = document.getElementById('previewImage');
const emptyStateText = document.getElementById('emptyStateText');
const roiBox = document.getElementById('roiBox');
const roiControls = document.getElementById('roiControls');
const roiSizeSlider = document.getElementById('roiSizeSlider');
const roiSizeVal = document.getElementById('roiSizeVal');
const analyzeBtn = document.getElementById('analyzeBtn');
const processCanvas = document.getElementById('processCanvas');
const resultSection = document.getElementById('resultSection');

const sampleType = document.getElementById('sampleType');
const detectedColorBox = document.getElementById('detectedColorBox');
const colorNameText = document.getElementById('colorNameText');
const rgbHsvDetails = document.getElementById('rgbHsvDetails');
const conditionState = document.getElementById('conditionState');
const phEstimateText = document.getElementById('phEstimateText');
const confidenceText = document.getElementById('confidenceText');
const adviceText = document.getElementById('adviceText');

const saveHistoryBtn = document.getElementById('saveHistoryBtn');
const newTestBtn = document.getElementById('newTestBtn');
const historySection = document.getElementById('historySection');
const historyTableBody = document.getElementById('historyTableBody');

let currentImage = null;
let currentAnalysis = null;
let historyRecords = [];

let roiX = 50;
let roiY = 50;
let roiSize = 80;
let isDragging = false;
let dragStartX, dragStartY;
let initialRoiX, initialRoiY;

function rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let h = 0;
    let s = max === 0 ? 0 : diff / max;
    let v = max;

    if (diff !== 0) {
        if (max === r) {
            h = ((g - b) / diff) % 6;
        } else if (max === g) {
            h = (b - r) / diff + 2;
        } else {
            h = (r - g) / diff + 4;
        }
        h = Math.round(h * 60);
        if (h < 0) h += 360;
    }

    s = Math.round(s * 100);
    v = Math.round(v * 100);

    return { h, s, v };
}

function classifyCabbagePaper(h, s, v, r, g, b) {
    let colorName = '';
    let condition = '';
    let cssClass = '';
    let phEstimate = '';
    let confidence = '85%';
    let advice = '';

    if ((h >= 320 && h <= 360) || (h >= 0 && h <= 25)) {
        colorName = h > 340 || h < 10 ? 'ชมพูเข้มอมแดง' : 'ชมพู / ม่วงอมชมพู';
        condition = 'กรด (คาดการณ์)';
        cssClass = 'state-acid';
        phEstimate = 'ประมาณ pH 2 – 4 (สภาวะกรด)';
        confidence = '92%';
        advice = 'กระดาษฉลากเปลี่ยนเป็นเฉดสีชมพู/แดงชัดเจน แนะนำตรวจซ้ำหรือใช้เครื่องวัด pH หากต้องการค่าทศนิยมที่แม่นยำ';
    } else if (h >= 240 && h < 320) {
        colorName = 'ม่วงธรรมชาติ (สีกะหล่ำปลีเดิม)';
        condition = 'ใกล้กลาง (คาดการณ์)';
        cssClass = 'state-neutral';
        phEstimate = 'ประมาณ pH 6 – 7 (สภาวะเป็นกลาง)';
        confidence = '90%';
        advice = 'สียังคงสภาพม่วงเดิมของสารแอนโทไซยานิน ไม่พบการทำปฏิกิริยากับกรดหรือด่างเข้มข้น';
    } else if (h >= 140 && h < 240) {
        colorName = h >= 190 ? 'น้ำเงินอมม่วง / ฟ้า' : 'เขียวอมฟ้า';
        condition = 'ด่าง (คาดการณ์)';
        cssClass = 'state-alkaline';
        phEstimate = 'ประมาณ pH 8 – 9 (สภาวะด่าง)';
        confidence = '88%';
        advice = 'กระดาษฉลากเริ่มเปลี่ยนเป็นสีฟ้า/น้ำเงิน แสดงถึงสารละลายมีแนวโน้มเป็นด่าง';
    } else if (h >= 45 && h < 140) {
        colorName = 'เขียว / เขียวอมเหลือง';
        condition = 'ด่าง (คาดการณ์)';
        cssClass = 'state-alkaline';
        phEstimate = 'ประมาณ pH 10 – 12 (สภาวะด่างเข้มข้น)';
        confidence = '89%';
        advice = 'สารสกัดแอนโทไซยานินสลายตัวเป็นสาร chalcone สีเขียว-เหลือง แสดงถึงสภาวะด่างเข้มข้น';
    } else {
        colorName = 'เฉดสีผสม / ไม่ชัดเจน';
        condition = 'ใกล้กลาง (คาดการณ์)';
        cssClass = 'state-neutral';
        phEstimate = 'ประมาณ pH 5 – 7';
        confidence = '72%';
        advice = 'สีที่ตรวจพบมีความหลากหลาย กรุณาจัดแสงให้สม่ำเสมอและลองสแกนใหม่อีกครั้ง';
    }

    return { colorName, condition, cssClass, phEstimate, confidence, advice };
}

function updateRoiPosition() {
    const boxWidth = previewImage.clientWidth;
    const boxHeight = previewImage.clientHeight;

    if (roiX < 0) roiX = 0;
    if (roiY < 0) roiY = 0;
    if (roiX + roiSize > boxWidth) roiX = Math.max(0, boxWidth - roiSize);
    if (roiY + roiSize > boxHeight) roiY = Math.max(0, boxHeight - roiSize);

    roiBox.style.left = `${roiX}px`;
    roiBox.style.top = `${roiY}px`;
    roiBox.style.width = `${roiSize}px`;
    roiBox.style.height = `${roiSize}px`;
}

imageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            previewImage.src = event.target.result;
            previewImage.style.display = 'block';
            if (emptyStateText) emptyStateText.style.display = 'none';
            
            previewImage.onload = function() {
                currentImage = previewImage;
                analyzeBtn.disabled = false;
                roiControls.style.display = 'block';
                roiBox.style.display = 'block';

                roiSize = Math.min(80, previewImage.clientWidth / 2);
                roiSizeSlider.max = Math.min(previewImage.clientWidth, previewImage.clientHeight);
                roiSizeSlider.value = roiSize;
                roiSizeVal.textContent = Math.round(roiSize);

                roiX = (previewImage.clientWidth - roiSize) / 2;
                roiY = (previewImage.clientHeight - roiSize) / 2;
                updateRoiPosition();
            };
        };
        reader.readAsDataURL(file);
    }
});

roiBox.addEventListener('mousedown', function(e) {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    initialRoiX = roiX;
    initialRoiY = roiY;
    e.preventDefault();
});

window.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    roiX = initialRoiX + (e.clientX - dragStartX);
    roiY = initialRoiY + (e.clientY - dragStartY);
    updateRoiPosition();
});

window.addEventListener('mouseup', function() {
    isDragging = false;
});

roiBox.addEventListener('touchstart', function(e) {
    if (e.touches.length === 1) {
        isDragging = true;
        dragStartX = e.touches[0].clientX;
        dragStartY = e.touches[0].clientY;
        initialRoiX = roiX;
        initialRoiY = roiY;
    }
}, { passive: false });

window.addEventListener('touchmove', function(e) {
    if (!isDragging) return;
    roiX = initialRoiX + (e.touches[0].clientX - dragStartX);
    roiY = initialRoiY + (e.touches[0].clientY - dragStartY);
    updateRoiPosition();
}, { passive: false });

window.addEventListener('touchend', function() {
    isDragging = false;
});

roiSizeSlider.addEventListener('input', function() {
    roiSize = parseInt(this.value, 10);
    roiSizeVal.textContent = roiSize;
    updateRoiPosition();
});

analyzeBtn.addEventListener('click', function() {
    if (!currentImage) return;

    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<span>⏳ กำลังประมวลผลโครงสร้างสี...</span>';

    setTimeout(() => {
        const canvas = processCanvas;
        const ctx = canvas.getContext('2d');

        canvas.width = currentImage.naturalWidth;
        canvas.height = currentImage.naturalHeight;
        ctx.drawImage(currentImage, 0, 0);

        const scaleX = currentImage.naturalWidth / currentImage.clientWidth;
        const scaleY = currentImage.naturalHeight / currentImage.clientHeight;

        const realRoiX = Math.floor(roiX * scaleX);
        const realRoiY = Math.floor(roiY * scaleY);
        const realRoiSizeX = Math.floor(roiSize * scaleX);
        const realRoiSizeY = Math.floor(roiSize * scaleY);

        const imgData = ctx.getImageData(realRoiX, realRoiY, realRoiSizeX, realRoiSizeY);
        const data = imgData.data;

        let totalR = 0, totalG = 0, totalB = 0;
        const pixelCount = data.length / 4;

        for (let i = 0; i < data.length; i += 4) {
            totalR += data[i];
            totalG += data[i + 1];
            totalB += data[i + 2];
        }

        const avgR = Math.round(totalR / pixelCount);
        const avgG = Math.round(totalG / pixelCount);
        const avgB = Math.round(totalB / pixelCount);

        const hsv = rgbToHsv(avgR, avgG, avgB);
        const result = classifyCabbagePaper(hsv.h, hsv.s, hsv.v, avgR, avgG, avgB);

        detectedColorBox.style.backgroundColor = `rgb(${avgR}, ${avgG}, ${avgB})`;
        detectedColorBox.classList.remove('swatch-bounce');
        void detectedColorBox.offsetWidth;
        detectedColorBox.classList.add('swatch-bounce');

        colorNameText.textContent = result.colorName;
        rgbHsvDetails.textContent = `R: ${avgR} | G: ${avgG} | B: ${avgB} | Hue: ${hsv.h}°`;

        conditionState.textContent = result.condition;
        conditionState.className = `field-badge scale-badge ${result.cssClass}`;

        phEstimateText.textContent = result.phEstimate;
        confidenceText.textContent = result.confidence;
        adviceText.textContent = result.advice;

        currentAnalysis = {
            sample: sampleType.value,
            rgb: `rgb(${avgR}, ${avgG}, ${avgB})`,
            colorName: result.colorName,
            condition: result.condition,
            phEstimate: result.phEstimate
        };

        resultSection.style.display = 'block';
        resultSection.classList.remove('result-enter');
        void resultSection.offsetWidth;
        resultSection.classList.add('result-enter');

        if (typeof confetti === 'function') {
            confetti({
                particleCount: 65,
                spread: 60,
                origin: { y: 0.7 },
                colors: ['#ab47bc', '#8e24aa', '#e91e63', '#26a69a']
            });
        }

        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<span>🔍 วิเคราะห์สีและประเมินสภาวะ (Analyze)</span>';

        setTimeout(() => {
            resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
    }, 400);
});

saveHistoryBtn.addEventListener('click', function() {
    if (!currentAnalysis) return;

    historyRecords.push(currentAnalysis);
    renderHistoryTable();
    historySection.style.display = 'block';
    saveHistoryBtn.disabled = true;
    saveHistoryBtn.textContent = '✅ บันทึกแล้ว';

    if (typeof confetti === 'function') {
        confetti({
            particleCount: 35,
            spread: 45,
            origin: { y: 0.85 },
            colors: ['#7b1fa2', '#ce93d8']
        });
    }
});

function renderHistoryTable() {
    historyTableBody.innerHTML = '';
    historyRecords.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>#${index + 1}</strong></td>
            <td>${item.sample}</td>
            <td><span class="history-swatch" style="background-color: ${item.rgb};"></span></td>
            <td>${item.colorName}</td>
            <td>${item.condition}</td>
            <td>${item.phEstimate}</td>
        `;
        historyTableBody.appendChild(row);
    });
}

newTestBtn.addEventListener('click', function() {
    previewImage.src = '';
    previewImage.style.display = 'none';
    emptyStateText.style.display = 'block';
    roiBox.style.display = 'none';
    roiControls.style.display = 'none';
    analyzeBtn.disabled = true;
    resultSection.style.display = 'none';
    imageInput.value = '';
    currentImage = null;
    currentAnalysis = null;
    saveHistoryBtn.disabled = false;
    saveHistoryBtn.textContent = '💾 บันทึกผลลงตาราง';

    window.scrollTo({ top: 0, behavior: 'smooth' });
});
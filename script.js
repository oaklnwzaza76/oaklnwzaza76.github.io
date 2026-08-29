// ส่วนควบคุม Animate On Scroll
document.addEventListener("DOMContentLoaded", function() {
    AOS.init({
        once: true,
        duration: 800
    });
});

// ส่วนระบุองค์ประกอบ DOM
const imageInput = document.getElementById('imageInput');
const previewImage = document.getElementById('previewImage');
const imageBox = document.getElementById('imageBox');
const emptyStateText = document.getElementById('emptyStateText');
const roiBox = document.getElementById('roiBox');
const roiControls = document.getElementById('roiControls');
const roiSizeSlider = document.getElementById('roiSizeSlider');
const roiSizeVal = document.getElementById('roiSizeVal');
const analyzeBtn = document.getElementById('analyzeBtn');
const processCanvas = document.getElementById('processCanvas');
const resultSection = document.getElementById('resultSection');

const filmFormula = document.getElementById('filmFormula');
const testDay = document.getElementById('testDay');

const detectedColorBox = document.getElementById('detectedColorBox');
const rgbText = document.getElementById('rgbText');
const hsvText = document.getElementById('hsvText');
const evaluationText = document.getElementById('evaluationText');

const downloadChartImgBtn = document.getElementById('downloadChartImgBtn');
const downloadChartCsvBtn = document.getElementById('downloadChartCsvBtn');
const resetDataBtn = document.getElementById('resetDataBtn');
const summaryContent = document.getElementById('summaryContent');

let currentImage = null;
let chartInstance = null;

let roiX = 50;
let roiY = 50;
let roiSize = 80;
let isDragging = false;
let dragStartX, dragStartY;
let initialRoiX, initialRoiY;

// ชุดข้อมูลเริ่มต้นของสูตรการทดลองทั้ง 4 สูตร
const chartDataSets = [
    {
        key: 'formula1',
        label: 'สูตร 1: ไม่เคลือบ',
        desc: 'กลุ่มควบคุมที่ไม่ได้รับการเคลือบฟิล์มป้องกัน',
        data: [null, null, null, null, null, null, null, null],
        borderColor: '#e03131',
        backgroundColor: '#e03131',
        borderWidth: 3,
        pointBackgroundColor: '#e03131',
        pointRadius: 5,
        pointHoverRadius: 8,
        tension: 0.3
    },
    {
        key: 'formula2',
        label: 'สูตร 2: ผงกล้วย 10%',
        desc: 'ฟิล์มเคลือบชีวภาพเสริมผงกล้วย 10%',
        data: [null, null, null, null, null, null, null, null],
        borderColor: '#f76707',
        backgroundColor: '#f76707',
        borderWidth: 3,
        pointBackgroundColor: '#f76707',
        pointRadius: 5,
        pointHoverRadius: 8,
        tension: 0.3
    },
    {
        key: 'formula3',
        label: 'สูตร 3: ผงกล้วย 20%',
        desc: 'ฟิล์มเคลือบชีวภาพเสริมผงกล้วย 20%',
        data: [null, null, null, null, null, null, null, null],
        borderColor: '#2f9e44',
        backgroundColor: '#2f9e44',
        borderWidth: 3,
        pointBackgroundColor: '#2f9e44',
        pointRadius: 5,
        pointHoverRadius: 8,
        tension: 0.3
    },
    {
        key: 'formula4',
        label: 'สูตร 4: ผงกล้วย 30%',
        desc: 'ฟิล์มเคลือบชีวภาพเสริมผงกล้วย 30%',
        data: [null, null, null, null, null, null, null, null],
        borderColor: '#1971c2',
        backgroundColor: '#1971c2',
        borderWidth: 3,
        pointBackgroundColor: '#1971c2',
        pointRadius: 5,
        pointHoverRadius: 8,
        tension: 0.3
    }
];

// ส่วนการแปลงค่าสี RGB เป็น HSV
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

// ส่วนคำนวณตำแหน่งแสดงผลของกรอบ ROI
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

// ส่วนจัดการเมื่อเลือกไฟล์รูปภาพ
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

// ส่วนจัดการอีเวนต์ลากย้ายกรอบ ROI
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
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    roiX = initialRoiX + dx;
    roiY = initialRoiY + dy;
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
    const dx = e.touches[0].clientX - dragStartX;
    const dy = e.touches[0].clientY - dragStartY;
    roiX = initialRoiX + dx;
    roiY = initialRoiY + dy;
    updateRoiPosition();
}, { passive: false });

window.addEventListener('touchend', function() {
    isDragging = false;
});

// ส่วนปรับขนาดกรอบ ROI ผ่านแถบเลื่อน
roiSizeSlider.addEventListener('input', function() {
    roiSize = parseInt(this.value, 10);
    roiSizeVal.textContent = roiSize;
    updateRoiPosition();
});

// ส่วนยิงเอฟเฟกต์พลุเฉลิมฉลอง
function triggerGoldenConfetti() {
    confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#ffd43b', '#fab005', '#f59f00', '#ffffff', '#e67700']
    });
}

// ส่วนประมวลผลสรุปประสิทธิภาพฟิล์ม
function checkAndGenerateSummary() {
    const completedFormulas = chartDataSets.filter(ds => ds.data[7] !== null && ds.data[0] !== null);

    if (completedFormulas.length === 0) {
        summaryContent.innerHTML = '<p class="summary-placeholder">กำลังรอข้อมูลบันทึกผลการทดลองจนถึง Day 7...</p>';
        return;
    }

    const ranked = completedFormulas.map(ds => {
        const diff = Math.abs(ds.data[7] - ds.data[0]);
        const finalHue = ds.data[7];
        return {
            ...ds,
            diff: diff,
            finalHue: finalHue
        };
    }).sort((a, b) => a.diff - b.diff);

    const best = ranked[0];

    triggerGoldenConfetti();

    let summaryHtml = `
        <div class="best-badge">🏆 สูตรที่มีประสิทธิภาพดีที่สุด</div>
        <div class="best-card">
            <h4>${best.label}</h4>
            <p><strong>คุณสมบัติเด่น:</strong> ${best.desc}</p>
            <p><strong>ผลการวิเคราะห์สี:</strong> ค่า Hue ในวันเริ่มต้น (Day 0) อยู่ที่ <strong>${best.data[0]}°</strong> และในวันที่ 7 (Day 7) คงสภาพอยู่ที่ <strong>${best.finalHue}°</strong> (เกิดการเปลี่ยนแปลงสีเพียง <strong>${best.diff}°</strong>)</p>
            <p><strong>สรุปผลทางวิทยาศาสตร์:</strong> แผ่นฟิล์มสูตรนี้สามารถป้องกันการเกิดปฏิกิริยาออกซิเดชัน (Oxidation) และชะลอการสลายตัวของสารแอนโทไซยานิน/รงควัตถุในน้ำผลไม้ได้ยาวนานที่สุดในระยะเวลา 7 วัน</p>
        </div>
        
        <h4 style="margin-top: 22px; color: #5c4700;">ตารางเปรียบเทียบการเปลี่ยนแปลงสี (Day 0 - Day 7):</h4>
        <table class="formula-rank-list">
            <thead>
                <tr>
                    <th>อันดับ</th>
                    <th>สูตรการทดลอง</th>
                    <th>Day 0 (Hue)</th>
                    <th>Day 7 (Hue)</th>
                    <th>ผลต่าง (ΔHue)</th>
                    <th>การประเมิน</th>
                </tr>
            </thead>
            <tbody>
    `;

    ranked.forEach((item, index) => {
        const status = index === 0 ? '🌟 ดีที่สุด (Best)' : (item.diff <= 25 ? '✅ ดี' : '⚠️ ปานกลาง / ต่ำ');
        summaryHtml += `
            <tr>
                <td><strong>#${index + 1}</strong></td>
                <td>${item.label}</td>
                <td>${item.data[0]}°</td>
                <td>${item.finalHue}°</td>
                <td>${item.diff}°</td>
                <td>${status}</td>
            </tr>
        `;
    });

    summaryHtml += `
            </tbody>
        </table>
    `;

    summaryContent.innerHTML = summaryHtml;
}

// ส่วนประมวลผลสีและบันทึกค่า
analyzeBtn.addEventListener('click', function() {
    if (!currentImage) return;

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

    detectedColorBox.style.backgroundColor = `rgb(${avgR}, ${avgG}, ${avgB})`;
    detectedColorBox.style.boxShadow = `0 4px 18px rgba(${avgR}, ${avgG}, ${avgB}, 0.6)`;
    rgbText.textContent = `R: ${avgR} | G: ${avgG} | B: ${avgB}`;
    hsvText.textContent = `H: ${hsv.h}° | S: ${hsv.s}% | V: ${hsv.v}%`;

    const selectedFormulaKey = filmFormula.value;
    const selectedDay = parseInt(testDay.value, 10);

    const targetDataset = chartDataSets.find(ds => ds.key === selectedFormulaKey);
    if (targetDataset) {
        targetDataset.data[selectedDay] = hsv.h;
        chartInstance.update();
        checkAndGenerateSummary();
    }

    evaluationText.textContent = `บันทึกค่า Hue = ${hsv.h}° จากพื้นที่ที่เลือก สำหรับ [${targetDataset.label}] ใน [Day ${selectedDay}] สำเร็จแล้ว`;
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

// ส่วนสร้างกราฟ Chart.js
document.addEventListener("DOMContentLoaded", function() {
    const ctx = document.getElementById('resultsChart').getContext('2d');
    
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Day 0', 'Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
            datasets: chartDataSets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            spanGaps: true,
            animation: {
                duration: 900,
                easing: 'easeOutQuart'
            },
            layout: {
                padding: {
                    top: 10,
                    bottom: 10
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        boxWidth: 9,
                        boxHeight: 9,
                        padding: 14,
                        color: '#493800',
                        font: {
                            family: "'Prompt', sans-serif",
                            size: 11,
                            weight: '600'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(56, 40, 0, 0.9)',
                    titleFont: { family: "'Prompt', sans-serif", weight: 'bold' },
                    bodyFont: { family: "'Prompt', sans-serif" },
                    padding: 10,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y !== null ? context.parsed.y + '°' : 'ยังไม่มีข้อมูล'}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    min: 0,
                    max: 360,
                    ticks: {
                        stepSize: 60,
                        color: '#796213',
                        font: { family: "'Prompt', sans-serif", size: 10 }
                    },
                    title: {
                        display: true,
                        text: 'ค่า Hue (0 - 360°)',
                        color: '#d9480f',
                        font: { family: "'Prompt', sans-serif", weight: 'bold', size: 11 }
                    },
                    grid: {
                        color: 'rgba(245, 159, 0, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#796213',
                        font: { family: "'Prompt', sans-serif", size: 10 },
                        maxRotation: 45,
                        minRotation: 0,
                        autoSkip: false
                    },
                    title: {
                        display: true,
                        text: 'วันที่บันทึกผลการทดลอง',
                        color: '#d9480f',
                        font: { family: "'Prompt', sans-serif", weight: 'bold', size: 11 }
                    },
                    grid: {
                        color: 'rgba(245, 159, 0, 0.1)'
                    }
                }
            }
        }
    });

    // ส่วนล้างข้อมูลการทดลอง
    resetDataBtn.addEventListener('click', function() {
        if (confirm('คุณต้องการล้างข้อมูลการทดลองทั้งหมดใช่หรือไม่?')) {
            chartDataSets.forEach(ds => {
                ds.data = [null, null, null, null, null, null, null, null];
            });
            chartInstance.update();
            resultSection.style.display = 'none';
            checkAndGenerateSummary();
        }
    });

    // ส่วนดาวน์โหลดรูปภาพกราฟ
    downloadChartImgBtn.addEventListener('click', function() {
        const chartCanvas = document.getElementById('resultsChart');
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = chartCanvas.width;
        tempCanvas.height = chartCanvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(chartCanvas, 0, 0);

        const link = document.createElement('a');
        link.download = 'chart-recorded-result.png';
        link.href = tempCanvas.toDataURL('image/png', 1.0);
        link.click();
    });

    // ส่วนส่งออกข้อมูล CSV
    downloadChartCsvBtn.addEventListener('click', function() {
        const days = ['Day 0', 'Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        
        csvContent += "สูตร," + days.join(",") + "\n";

        chartDataSets.forEach(dataset => {
            const formattedData = dataset.data.map(val => val === null ? "" : val);
            const row = [`"${dataset.label}"`, ...formattedData].join(",");
            csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'color_recorded_data.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});
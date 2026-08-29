// ส่วนจัดการ DOM Elements
const imageInput = document.getElementById('imageInput');
const previewImage = document.getElementById('previewImage');
const imageBox = document.getElementById('imageBox');
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

// ตัวแปรพิกัดและขนาดของกรอบ ROI
let roiX = 50;
let roiY = 50;
let roiSize = 80;
let isDragging = false;
let dragStartX, dragStartY;
let initialRoiX, initialRoiY;

// ข้อมูลชุดผลการทดลอง ปรับพาเลตต์สีกราฟให้เข้ากับธีม
const chartDataSets = [
    {
        key: 'formula1',
        label: 'สูตร 1: ไม่เคลือบแผ่นฟิล์ม',
        desc: 'กลุ่มควบคุมที่ไม่ได้รับการเคลือบฟิล์มป้องกัน',
        data: [null, null, null, null, null, null, null, null],
        borderColor: '#dc2626',
        backgroundColor: '#dc2626',
        tension: 0.2
    },
    {
        key: 'formula2',
        label: 'สูตร 2: ผงกล้วย 10%',
        desc: 'ฟิล์มเคลือบชีวภาพเสริมผงกล้วย 10%',
        data: [null, null, null, null, null, null, null, null],
        borderColor: '#f59e0b',
        backgroundColor: '#f59e0b',
        tension: 0.2
    },
    {
        key: 'formula3',
        label: 'สูตร 3: ผงกล้วย 20%',
        desc: 'ฟิล์มเคลือบชีวภาพเสริมผงกล้วย 20%',
        data: [null, null, null, null, null, null, null, null],
        borderColor: '#10b981',
        backgroundColor: '#10b981',
        tension: 0.2
    },
    {
        key: 'formula4',
        label: 'สูตร 4: ผงกล้วย 30%',
        desc: 'ฟิล์มเคลือบชีวภาพเสริมผงกล้วย 30%',
        data: [null, null, null, null, null, null, null, null],
        borderColor: '#0284c7',
        backgroundColor: '#0284c7',
        tension: 0.2
    }
];

// ฟังก์ชันแปลง RGB เป็น HSV
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

// อัปเดตตำแหน่งและขนาดกรอบ ROI บนหน้าจอ
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

// ส่วนจัดการเมื่ออัปโหลดรูปภาพ
imageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            previewImage.src = event.target.result;
            previewImage.style.display = 'block';
            
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

// ส่วนจัดการลากย้ายกรอบ ROI (Mouse / Touch)
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

// ปรับขนาดกรอบ ROI ผ่านสไลเดอร์
roiSizeSlider.addEventListener('input', function() {
    roiSize = parseInt(this.value, 10);
    roiSizeVal.textContent = roiSize;
    updateRoiPosition();
});

// ฟังก์ชันตรวจสอบและสรุปผลสูตรที่ดีที่สุดเมื่อมีข้อมูล Day 7
function checkAndGenerateSummary() {
    const completedFormulas = chartDataSets.filter(ds => ds.data[7] !== null && ds.data[0] !== null);

    if (completedFormulas.length === 0) {
        summaryContent.innerHTML = '<p class="summary-placeholder"><i class="fa-solid fa-hourglass-half"></i> กำลังรอข้อมูลบันทึกผลการทดลองจนถึง Day 7...</p>';
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

    let summaryHtml = `
        <div class="best-badge"><i class="fa-solid fa-crown"></i> สูตรที่มีประสิทธิภาพดีที่สุด</div>
        <div class="best-card">
            <h4><i class="fa-solid fa-certificate" style="color: #f59e0b;"></i> ${best.label}</h4>
            <p><strong>คุณสมบัติ:</strong> ${best.desc}</p>
            <p><strong>ผลการวิเคราะห์สี:</strong> ค่า Hue ในวันเริ่มต้น (Day 0) อยู่ที่ <strong>${best.data[0]}°</strong> และในวันที่ 7 (Day 7) คงสภาพอยู่ที่ <strong>${best.finalHue}°</strong> (เกิดการเปลี่ยนแปลงสีเพียง <strong>${best.diff}°</strong>)</p>
            <p><strong>สรุปผลทางวิทยาศาสตร์:</strong> แผ่นฟิล์มสูตรนี้สามารถป้องกันการเกิดปฏิกิริยาออกซิเดชัน (Oxidation) และชะลอการสลายตัวของสารแอนโทไซยานิน/รงควัตถุในน้ำผลไม้ได้ยาวนานที่สุดในระยะเวลา 7 วัน</p>
        </div>
        
        <h4 style="margin-top: 22px; color: #92400e; font-size: 1.05rem;"><i class="fa-solid fa-table-list"></i> ตารางเปรียบเทียบการเปลี่ยนแปลงสี (Day 0 - Day 7):</h4>
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
        const status = index === 0 ? '<span style="color:#059669; font-weight:700;"><i class="fa-solid fa-circle-check"></i> ดีที่สุด</span>' : (item.diff <= 25 ? '<span style="color:#d97706; font-weight:600;">ดี</span>' : '<span style="color:#dc2626;">ปานกลาง / ต่ำ</span>');
        summaryHtml += `
            <tr>
                <td><strong>#${index + 1}</strong></td>
                <td>${item.label}</td>
                <td>${item.data[0]}°</td>
                <td>${item.finalHue}°</td>
                <td><strong>${item.diff}°</strong></td>
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

// ส่วนคำนวณและประมวลผลสีจาก ROI ตามตำแหน่งที่เลือกจริง
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

    evaluationText.innerHTML = `บันทึกค่า Hue = <strong>${hsv.h}°</strong> จากพื้นที่ที่เลือก สำหรับ [${targetDataset.label}] ใน [Day ${selectedDay}] เรียบร้อยแล้ว`;
    resultSection.style.display = 'block';
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
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        boxWidth: 14,
                        padding: 15,
                        font: {
                            family: 'Prompt',
                            size: 12
                        },
                        color: '#451a03'
                    }
                }
            },
            scales: {
                y: {
                    min: 0,
                    max: 360,
                    ticks: {
                        stepSize: 60,
                        color: '#78350f',
                        font: {
                            family: 'Prompt'
                        }
                    },
                    title: {
                        display: true,
                        text: 'ค่า Hue (0 - 360°)',
                        color: '#92400e',
                        font: {
                            family: 'Prompt',
                            weight: '600'
                        }
                    },
                    grid: {
                        color: 'rgba(245, 158, 11, 0.12)'
                    }
                },
                x: {
                    ticks: {
                        color: '#78350f',
                        font: {
                            family: 'Prompt'
                        }
                    },
                    title: {
                        display: true,
                        text: 'วันที่บันทึกผลการทดลอง',
                        color: '#92400e',
                        font: {
                            family: 'Prompt',
                            weight: '600'
                        }
                    },
                    grid: {
                        color: 'rgba(245, 158, 11, 0.12)'
                    }
                }
            }
        }
    });

    // ฟังก์ชันล้างข้อมูลทั้งหมด
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

    // ฟังก์ชันบันทึกกราฟเป็นรูปภาพ PNG
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
        link.download = 'banana_film_chart_result.png';
        link.href = tempCanvas.toDataURL('image/png', 1.0);
        link.click();
    });

    // ฟังก์ชันบันทึกข้อมูลกราฟเป็นไฟล์ CSV
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
        link.setAttribute('download', 'banana_film_color_data.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});
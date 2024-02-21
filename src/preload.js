const { ipcRenderer } = require('electron')
const XLSX = require('xlsx');
const version = document.getElementById('version')
const warp = document.getElementById('warp');
const message = document.getElementById('message');
const restartButton = document.getElementById('restart-button');
const loaderDownload = document.getElementById('warp-loader')
const showLogCheckbox = document.getElementById('show')
const logTable = document.querySelector('table')
const logTextarea = document.getElementById('log')
const start = document.getElementById('start')
const stop = document.getElementById('stop')
const progs = document.getElementById('prog')
const unduh = document.getElementById('export')
const files = document.getElementById('files')
const table = document.getElementById('table-data')

document.querySelector('header').style.webkitAppRegion = 'drag'
let previousReportData = [];

showLogCheckbox.addEventListener('change', function () {
    if (showLogCheckbox.checked) {
        logTextarea.classList.remove('hidden')
        logTextarea.scrollTop = logTextarea.scrollHeight
    } else {
        logTextarea.classList.add('hidden')
    }
});

document.addEventListener('change', function () {
    const files = document.getElementById('files').files[0]?.path;
    if (files == null || files == "") {
        start.setAttribute('disabled', true);
    } else if (files != "") {
        start.removeAttribute('disabled');
    }
})

start.addEventListener('click', () => {
    const data = {
        files: files.files[0]?.path,
    }

    clearLogTable()
    previousReportData = [];
    initNumb = 0;
    progs.innerText = '0%'
    progs.style.width = '0%'
    ipcRenderer.send('main', data)
})

function clearLogTable() {
    const rowCount = logTable.rows.length;
    for (let i = rowCount - 1; i > 0; i--) {
        logTable.deleteRow(i);
    }
}

const allElement = [files]

ipcRenderer.on('run', () => {
    start.classList.add('hidden')
    stop.classList.remove('hidden')
    allElement.forEach(e => e.disabled = true)
    unduh.classList.add('hidden')
})

ipcRenderer.on('force', () => {
    start.classList.remove('hidden')
    stop.classList.add('hidden')
    allElement.forEach(e => e.disabled = false)
    unduh.classList.remove('hidden')
})

ipcRenderer.on('log', (event, logs) => {
    logTextarea.value = logs;
    logTextarea.scrollTop = logTextarea.scrollHeight;
});

function proggress(prog) {
    progs.style.width = `${prog}%`;
    progs.innerHTML = `${prog}%`;
}

ipcRenderer.on('proggress', (event, prog) => {
    for (const pros of prog) {
        proggress(pros);
    }
});

stop.addEventListener('click', () => {
    if (confirm("Realy want to stop the proccess ?") == true) {
        start.classList.remove("hidden")
        stop.classList.add("hidden")
        ipcRenderer.send('stop');
    }
});

unduh.addEventListener('click', function () {
    const wb = XLSX.utils.table_to_book(logTable);
    if (!wb['Sheets']['Sheet1']['!cols']) {
        wb['Sheets']['Sheet1']['!cols'] = [];
    }
    wb['Sheets']['Sheet1']['!cols'][0] = {
        width: 5
    };
    wb['Sheets']['Sheet1']['!cols'][1] = {
        width: 30
    };
    wb['Sheets']['Sheet1']['!cols'][2] = {
        width: 30
    };
    wb['Sheets']['Sheet1']['!cols'][3] = {
        width: 30
    };
    wb['Sheets']['Sheet1']['!cols'][4] = {
        width: 30
    };

    const data = XLSX.write(wb, {
        bookType: 'xlsx',
        type: 'array'
    });
    ipcRenderer.send('save-excel-data', data);
});

let initNumb = 0

function logToTable(url, hasil) {
    if (url !== undefined && hasil !== undefined) {
        const isDuplicate = previousReportData.some(report => report.url === url);

        if (!isDuplicate) {
            initNumb++;
            const newRow = table.insertRow();
            const rowHtml = `<tr>
            <th scope="row">${initNumb}</th>
            <td>${url}</td>
            <td>${hasil.domainRating}</td>
            <td>${hasil.backLink}</td>
            <td>${hasil.link}</td>
          </tr>`;

            
            newRow.innerHTML = rowHtml;
            document.getElementById('scrl').scrollTop = document.getElementById('scrl').scrollHeight;

            previousReportData.push({
                url,
                hasil
            });
        }
    }
}
ipcRenderer.on('logToTable', (event, report) => {
    for (const log of report) {
        logToTable(log.url, log.hasil);
    }
});


// handle updater

let updateProgress = 0;
ipcRenderer.send('app_version');
ipcRenderer.on('app_version', (event, arg) => {
    version.innerText = 'v' + arg.version;
});

ipcRenderer.on('update_available', () => {
    ipcRenderer.removeAllListeners('update_available');
    message.innerText = 'A new update is available. Downloading now...';
    warp.classList.remove('hidden');
    loaderDownload.classList.remove('hidden');
});

ipcRenderer.on('update_progress', (event, progress) => {
    updateProgress = progress;
    const progsDown = document.getElementById('download-progress')
    progsDown.style.width = updateProgress + '%'
    progsDown.setAttribute('aria-valuenow', updateProgress)
});

ipcRenderer.on('update_downloaded', () => {
    ipcRenderer.removeAllListeners('update_downloaded');
    message.innerText = 'Update Downloaded. It will be installed on restart. Restart now?';
    restartButton.classList.remove('d-none');
    warp.classList.remove('hidden');

    loaderDownload.classList.add('hidden');
});

restartButton.addEventListener("click", (e) => {
    ipcRenderer.send('restart_app');
})
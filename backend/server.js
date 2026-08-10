const express = require('express');
const cors = require('cors');
const xlsx = require('xlsx');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.json());

// Servir la aplicación frontend estática construida por Quasar
app.use(express.static(path.join(__dirname, '../frontend/dist/spa')));

const RUTAS_MANUALES_FILE = path.join(__dirname, 'rutas_manuales.xlsx');

// ================== FUNCIONES ==================
function cargarRutasManuales() {
    try {
        if (fs.existsSync(RUTAS_MANUALES_FILE)) {
            const wb = xlsx.readFile(RUTAS_MANUALES_FILE);
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = xlsx.utils.sheet_to_json(ws);
            return data.map(row => row.ruta).filter(Boolean);
        }
    } catch (error) {
        console.error("Error al cargar rutas manuales:", error);
    }
    return [];
}

function guardarRutaManual(nuevaRuta) {
    try {
        let rutasExistentes = [];
        if (fs.existsSync(RUTAS_MANUALES_FILE)) {
            const wb = xlsx.readFile(RUTAS_MANUALES_FILE);
            const ws = wb.Sheets[wb.SheetNames[0]];
            rutasExistentes = xlsx.utils.sheet_to_json(ws);
        }
        if (rutasExistentes.find(r => r.ruta === nuevaRuta)) return false;
        rutasExistentes.push({ ruta: nuevaRuta, fecha_agregada: new Date().toISOString() });
        const wsNueva = xlsx.utils.json_to_sheet(rutasExistentes);
        const wbNueva = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wbNueva, wsNueva, 'RutasManuales');
        xlsx.writeFile(wbNueva, RUTAS_MANUALES_FILE);
        return true;
    } catch (error) {
        console.error("Error al guardar ruta manual:", error);
        return false;
    }
}

function cargarDatos() {
    try {
        const wbCentros = xlsx.readFile(path.join(__dirname, 'consolidado_anexos.xlsx'));
        const wsCentros = wbCentros.Sheets[wbCentros.SheetNames[0]];
        const dataCentros = xlsx.utils.sheet_to_json(wsCentros, { range: 6 });
        const listaDestinos = dataCentros.map(row =>
            `${row['Código C.E.']}- ${row['Centro Educativo']}, ${row['Departamento']}, ${row['Municipio']}`
        );

        const wbPersonal = xlsx.readFile(path.join(__dirname, 'Personal MINEDUCYT.xlsx'));
        const wsPersonal = wbPersonal.Sheets[wbPersonal.SheetNames[0]];
        const dataPersonal = xlsx.utils.sheet_to_json(wsPersonal);
        const listaMotoristas = [...new Set(dataPersonal.map(r => r['Motoristas']).filter(Boolean))];
        const listaPersonal = [...new Set(dataPersonal.map(r => r['Personal']).filter(Boolean))];

        let listaSedes = ["MINEDUCYT Nivel Central, San Salvador, San Salvador"];
        try {
            const wbSedes = xlsx.readFile(path.join(__dirname, 'Sede Enlaces.xlsx'));
            const wsSedes = wbSedes.Sheets[wbSedes.SheetNames[0]];
            const dataSedes = xlsx.utils.sheet_to_json(wsSedes);
            const sedesExtra = dataSedes.map(row => `Sede Enlaces ${row['Municipio']}, ${row['Departamento']}`);
            listaSedes = listaSedes.concat(sedesExtra);
        } catch (error) {
            console.log("No se encontró Sede Enlaces.xlsx, se usará solo Nivel Central.");
        }

        const listaRutasManuales = cargarRutasManuales();
        return { listaDestinos, listaMotoristas, listaPersonal, listaSedes, listaRutasManuales };
    } catch (error) {
        console.error("Error al leer los archivos Excel:", error);
        return null;
    }
}

// ================== ENDPOINTS ==================
app.get('/api/datos', (req, res) => {
    const datos = cargarDatos();
    if (datos) res.json(datos);
    else res.status(500).json({ error: "Error interno al cargar las bases de datos" });
});

app.post('/api/guardar-ruta', (req, res) => {
    const { ruta } = req.body;
    if (!ruta || ruta.trim() === '') {
        return res.status(400).json({ error: "La ruta no puede estar vacía" });
    }
    const guardado = guardarRutaManual(ruta.trim());
    if (guardado) res.json({ success: true, message: "Ruta guardada correctamente" });
    else res.status(400).json({ error: "La ruta ya existe o hubo un error al guardarla" });
});

app.post('/api/generar', (req, res) => {
    const data = req.body;
    try {
        const formatFecha = (fechaISO) => {
            if (!fechaISO) return "";
            const [year, month, day] = fechaISO.split('-');
            return `${day}/${month}/${year}`;
        };
        const formatHora = (hora24) => {
            if (!hora24) return "";
            let [hours, minutes] = hora24.split(':');
            let ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            hours = hours < 10 ? '0' + hours : hours;
            return `${hours}:${minutes} ${ampm}`;
        };

        // ==========================================
        // REGLA 1: TELÉFONO SÓLO PARA EL PRIMER NOMBRE Y REDACCIÓN NATURAL
        // ==========================================
        const wbPersonal = xlsx.readFile(path.join(__dirname, 'Personal MINEDUCYT.xlsx'));
        const wsPersonal = wbPersonal.Sheets[wbPersonal.SheetNames[0]];
        const dataPersonalRaw = xlsx.utils.sheet_to_json(wsPersonal, { header: "A", defval: "" });

        const mapTelefonos = {};
        dataPersonalRaw.forEach(row => {
            const telefono = row['C'];
            if (telefono) {
                if (row['A']) mapTelefonos[row['A'].toString().trim()] = telefono.toString().trim();
                if (row['B']) mapTelefonos[row['B'].toString().trim()] = telefono.toString().trim();
            }
        });

        // Lógica para formatear con "número de teléfono:" y unir con "y" al final
        let nombresFormateados = "";
        if (data.nombres && data.nombres.length > 0) {
            const primerNombre = data.nombres[0].trim();
            const telefono = mapTelefonos[primerNombre];

            // Construimos la base del primer nombre
            let textoPrimerNombre = primerNombre;
            if (telefono) {
                textoPrimerNombre += ` número de teléfono: ${telefono}`;
            }

            // Unimos dependiendo de la cantidad de personas seleccionadas
            if (data.nombres.length === 1) {
                nombresFormateados = textoPrimerNombre;
            } else if (data.nombres.length === 2) {
                nombresFormateados = `${textoPrimerNombre} y ${data.nombres[1].trim()}`;
            } else {
                // Si hay más de 2 personas, usamos comas y la "y" para el último
                const otrosNombres = data.nombres.slice(1);
                const ultimoNombre = otrosNombres.pop().trim();
                nombresFormateados = `${textoPrimerNombre}, ${otrosNombres.map(n => n.trim()).join(', ')} y ${ultimoNombre}`;
            }
        }
        // ==========================================
        // REGLA 2: SEPARAR DESTINOS PARA TABLA (SOPORTE PARA SEDES Y OFICINAS)
        // ==========================================
        const destinosArray = data.destinos.map(d => {
            let textoLimpio = d ? d.replace(/undefined/g, '').trim() : "";
            textoLimpio = textoLimpio.replace(/,+$/, '').trim();

            const guionIndex = textoLimpio.indexOf('-');

            // 1. Caso: Centro Escolar (tiene código numérico al inicio seguido de un guión)
            if (guionIndex > -1 && !isNaN(parseInt(textoLimpio.substring(0, guionIndex)))) {
                const codigo = textoLimpio.substring(0, guionIndex).trim();
                let resto = textoLimpio.substring(guionIndex + 1).trim();

                const partes = resto.split(',').map(p => p.trim()).filter(p => p !== "");

                if (partes.length >= 3) {
                    const municipio = partes.pop();
                    const departamento = partes.pop();
                    const institucion = partes.join(', ');
                    return { codigo, institucion, departamento, municipio };
                }
                else if (partes.length === 2) {
                    return { codigo, institucion: partes[0], departamento: partes[1], municipio: "-" };
                }
                else if (partes.length === 1) {
                    return { codigo, institucion: partes[0], departamento: "-", municipio: "-" };
                }
            }

            // 2. Caso específico: Sedes Enlaces
            // El formato que viene del frontend es: "Sede Enlaces Metapán, Santa Ana"
            if (textoLimpio.toLowerCase().includes("sede enlaces")) {
                const partes = textoLimpio.split(',');
                if (partes.length >= 2) {
                    const departamento = partes[partes.length - 1].trim();
                    const institucionCompleta = partes[0].trim(); // Toma "Sede Enlaces Metapán"

                    // Extraemos el municipio eliminando la frase "Sede Enlaces"
                    const municipio = institucionCompleta.replace(/Sede Enlaces/ig, '').trim();

                    return {
                        codigo: "N/A",
                        institucion: institucionCompleta,
                        departamento: departamento,
                        municipio: municipio || "-"
                    };
                }
            }

            // 3. Caso específico: MINEDUCYT Nivel Central
            if (textoLimpio.toLowerCase().includes("nivel central")) {
                return {
                    codigo: "N/A",
                    institucion: "MINEDUCYT Nivel Central",
                    departamento: "San Salvador",
                    municipio: "San Salvador"
                };
            }

            // 4. Fallback General: Rutas manuales u otros destinos sin código
            const partesManual = textoLimpio.split(',');

            // Si la ruta viene con las 3 partes (Institución, Departamento, Municipio)
            if (partesManual.length >= 3) {
                const municipio = partesManual.pop().trim();
                const departamento = partesManual.pop().trim();
                const institucion = partesManual.join(', ').trim();

                return {
                    codigo: "N/A",
                    institucion: institucion,
                    departamento: departamento,
                    municipio: municipio
                };
            }

            // Si por alguna razón es una ruta antigua con otro formato
            return {
                codigo: "N/A",
                institucion: textoLimpio || "-",
                departamento: "-",
                municipio: "-"
            };
        });

        // Construimos el contexto que se enviará al Word
        const contexto = {
                fecha_actual: formatFecha(data.fecha_emision),
                nombres: nombresFormateados, // Reemplazado con nuestra nueva lógica
                detalle_mision: data.mision,
                destinos: destinosArray,     // Reemplazado para que sea un arreglo utilizable en tablas
                lugar_salida: data.lugar_salida,
                fecha_mision: formatFecha(data.fecha_mision),
                hora_salida: formatHora(data.hora_salida),
                placa: data.placa,
                clase_vehiculo: data.clase_vehiculo,
                monto: data.monto === "Ninguno" ? "" : data.monto.replace("$", ""),
                nombre_motorista: data.motorista ? data.motorista.toUpperCase() : ""
            };

            const content = fs.readFileSync(path.join(__dirname, 'plantilla_transporte.docx'), 'binary');
            const zip = new PizZip(content);
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
                delimiters: { start: '{{', end: '}}' }
            });

            doc.render(contexto);

            const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
            res.setHeader('Content-Disposition', `attachment; filename="${data.placa}-Misión Oficial - ${data.fecha_mision}.docx"`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.send(buf);
        } catch (error) {
            console.error("Error al generar el documento:", error);
            res.status(500).json({ error: "Error al generar el documento." });
        }
    });

app.delete('/api/eliminar-ruta/:ruta', (req, res) => {
    const rutaAEliminar = decodeURIComponent(req.params.ruta);
    if (!rutaAEliminar) return res.status(400).json({ error: "No se especificó la ruta a eliminar" });
    try {
        if (!fs.existsSync(RUTAS_MANUALES_FILE)) return res.status(404).json({ error: "No hay rutas guardadas" });
        const wb = xlsx.readFile(RUTAS_MANUALES_FILE);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rutas = xlsx.utils.sheet_to_json(ws);
        const nuevasRutas = rutas.filter(r => r.ruta !== rutaAEliminar);
        if (nuevasRutas.length === rutas.length) return res.status(404).json({ error: "La ruta no existe" });
        const wsNueva = xlsx.utils.json_to_sheet(nuevasRutas);
        const wbNueva = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wbNueva, wsNueva, 'RutasManuales');
        xlsx.writeFile(wbNueva, RUTAS_MANUALES_FILE);
        res.json({ success: true, message: "Ruta eliminada correctamente" });
    } catch (error) {
        console.error("Error al eliminar ruta:", error);
        res.status(500).json({ error: "Error interno al eliminar la ruta" });
    }
});

// Redirigir cualquier otra ruta al index.html del frontend (importante para Vue Router)
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/spa/index.html'));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});
<template>
  <q-page class="page-background q-pa-md">
    <div style="max-width: 900px; margin: auto;">
      <div class="row items-center q-mb-lg q-mt-sm">
        <q-avatar size="56px" color="primary" text-color="white" class="q-mr-md shadow-3" style="background: linear-gradient(135deg, #1976D2 0%, #1565C0 100%);">
          <q-icon name="description" size="32px" />
        </q-avatar>
        <div>
          <div class="text-h5 text-weight-bold text-dark" style="letter-spacing: -0.5px;">Generar Solicitud de Misión</div>
          <div class="text-subtitle2 text-grey-7" style="margin-top: -2px;">Complete el formulario para descargar el documento oficial</div>
        </div>
      </div>

      <q-card class="q-pa-md q-mb-xl shadow-2 form-card">
        <div class="text-h6 q-mb-sm">Datos de la Misión</div>
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-md-6">
          <q-select 
            v-model="formulario.nombres" 
            :options="opciones.personal_disponible" 
            label="Personal que viaja" 
            multiple use-chips outlined clearable 
            @update:model-value="() => { limpiarError('nombres'); actualizarListaPersonal(); }"
            :error="errores.nombres"
            error-message="Seleccione al menos una persona"
          />
        </div>
        <div class="col-12 col-md-6">
          <q-select 
            v-model="formulario.mision" 
            :options="misiones_fijas" 
            label="Detalle de Misión" 
            outlined clearable 
            @update:model-value="limpiarError('mision')"
            :error="errores.mision"
            error-message="Seleccione una misión"
          />
        </div>
      </div>

      <q-separator class="q-my-md" />

      <div class="text-h6 q-mb-sm">📍 Destinos</div>
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-12">
          <q-select 
            v-model="formulario.destinos_ce" 
            :options="opciones.destinos_disponibles" 
            label="Centros Escolares" 
            multiple use-chips outlined clearable 
            use-input @filter="filtrarDestinos"
            @update:model-value="() => { limpiarError('destinos'); actualizarListaDestinos(); }"
            :error="errores.destinos"
          >
            <template v-if="opciones.destinos_disponibles.length === 0 && (formulario.destinos_ce || []).length > 0" v-slot:option>
              <q-item>
                <q-item-section>No hay más destinos disponibles</q-item-section>
              </q-item>
            </template>
          </q-select>
        </div>
        <div class="col-12">
          <q-select 
            v-model="formulario.sedes" 
            :options="opciones.sedes_disponibles" 
            label="Sedes Enlaces y Oficinas" 
            multiple use-chips outlined clearable 
            @update:model-value="() => { limpiarError('destinos'); actualizarListaSedes(); }"
            :error="errores.destinos"
          >
            <template v-if="opciones.sedes_disponibles.length === 0 && (formulario.sedes || []).length > 0" v-slot:option>
              <q-item>
                <q-item-section>No hay más sedes disponibles</q-item-section>
              </q-item>
            </template>
          </q-select>
        </div>
        
        <div class="col-12">
          <q-select 
            v-model="formulario.rutas_extra" 
            :options="opciones.rutas_manuales_disponibles" 
            label="Rutas guardadas anteriormente" 
            multiple use-chips outlined clearable 
            @update:model-value="() => { limpiarError('destinos'); actualizarListaRutasManuales(); }"
            :error="errores.destinos"
          >
            <template v-if="opciones.rutas_manuales_disponibles.length === 0 && (formulario.rutas_extra || []).length > 0" v-slot:option>
              <q-item>
                <q-item-section>No hay más rutas disponibles</q-item-section>
              </q-item>
            </template>
          </q-select>
        </div>

        <!-- Mensaje de error global para destinos -->
        <div v-if="errores.destinos" class="col-12 text-negative text-caption">
          Debe seleccionar al menos un destino (Centro Escolar, Sede o Ruta guardada)
        </div>
        
        <!-- Expansion Item para gestionar rutas personalizadas (agregar/eliminar) -->
        <div class="col-12 q-mt-md">
          <q-expansion-item
            v-model="mostrarAgregarRuta"
            expand-separator
            icon="add_location"
            label="Gestionar rutas personalizadas"
            caption="Agrega o elimina rutas manuales (se guardan permanentemente)"
            class="custom-expansion"
            header-class="text-primary"
          >
            <q-card flat bordered class="q-pa-md" style="background: #f5f7fa;">
              <!-- Sección para AGREGAR nueva ruta -->
              <div class="text-subtitle2 text-weight-bold q-mb-sm">
                <q-icon name="add_circle" size="sm" color="positive" />
                Agregar nueva ruta
              </div>
              <div class="row q-col-gutter-md q-mb-lg">
                <div class="col-12 col-md-8">
                  <q-input 
                    v-model="nuevaRuta" 
                    label="Escriba la nueva ruta..." 
                    outlined 
                    dense
                    @keyup.enter="agregarRutaManual"
                    hint="Ejemplo: Centro de Gobierno, San Salvador"
                    :loading="guardandoRuta"
                  >
                    <template v-slot:prepend>
                      <q-icon name="edit_location" color="primary" />
                    </template>
                  </q-input>
                </div>
                <div class="col-12 col-md-4 flex flex-center">
                  <q-btn 
                    color="primary" 
                    icon="save" 
                    label="Guardar Ruta" 
                    size="lg"
                    @click="agregarRutaManual" 
                    class="full-width text-weight-bold shadow-2"
                    :loading="guardandoRuta"
                    style="height: 56px; border-radius: 8px;"
                  />
                </div>
              </div>
              
              <q-separator class="q-mb-md" />
              
              <!-- Sección para ELIMINAR rutas existentes -->
              <div class="text-subtitle2 text-weight-bold q-mb-sm">
                <q-icon name="delete_sweep" size="sm" color="negative" />
                Eliminar rutas guardadas
              </div>
              
              <div v-if="opciones.rutas_manuales_originales.length === 0" class="text-center q-pa-md text-grey-6">
                <q-icon name="info" size="md" />
                No hay rutas manuales guardadas aún.
              </div>
              
              <div v-else class="row q-col-gutter-sm">
                <div v-for="(ruta, index) in opciones.rutas_manuales_originales" :key="index" class="col-12">
                  <q-item class="rounded-borders" style="background: white; border: 1px solid #e0e0e0;">
                    <q-item-section>
                      <q-item-label class="text-body2">{{ ruta }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-btn 
                        flat 
                        round 
                        dense 
                        icon="delete" 
                        color="negative"
                        @click="eliminarRuta(ruta)"
                        :loading="eliminandoRuta === ruta"
                      >
                        <q-tooltip>Eliminar esta ruta permanentemente</q-tooltip>
                      </q-btn>
                    </q-item-section>
                  </q-item>
                </div>
              </div>
              
              <div class="text-caption text-grey-7 q-mt-sm">
                <q-icon name="warning" size="xs" color="orange" /> Las rutas eliminadas no se pueden recuperar.
              </div>
            </q-card>
          </q-expansion-item>
        </div>
      </div>

      <q-separator class="q-my-md" />

      <div class="text-h6 q-mb-sm">🕒 Datos de Salida</div>
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-md-6">
          <q-input v-model="formulario.lugar_salida" label="Lugar de salida" outlined />
        </div>
        <div class="col-12 col-md-6">
          <q-input v-model="formulario.hora_salida" type="time" label="Hora de salida" outlined stack-label />
        </div>
        <div class="col-12 col-md-6">
          <q-input v-model="formulario.fecha_emision" type="date" label="Fecha de emisión" outlined stack-label />
        </div>
        <div class="col-12 col-md-6">
          <q-input 
            ref="inputFechaMision"
            v-model="formulario.fecha_mision" 
            type="date"
            label="Fecha de Misión" 
            outlined stack-label 
            class="cursor-pointer"
            @update:model-value="limpiarError('fecha_mision')"
            :error="errores.fecha_mision"
            error-message="Seleccione la fecha de la misión"
            @click="abrirPickerMision"
          />
        </div>
      </div>

      <q-separator class="q-my-md" />

      <div class="text-h6 q-mb-sm">🚙 Datos del Vehículo</div>
      <div class="row q-col-gutter-md q-mb-lg">
        <div class="col-12 col-md-3">
          <q-input v-model="formulario.clase_vehiculo" label="Clase" outlined />
        </div>
        <div class="col-12 col-md-3">
          <q-select 
            v-model="formulario.placa" 
            :options="['18931', '18928', '18901']" 
            label="Placa" 
            outlined clearable 
            @update:model-value="limpiarError('placa')"
            :error="errores.placa"
            error-message="Seleccione una placa"
          />
        </div>
        <div class="col-12 col-md-3">
          <q-select v-model="formulario.monto" :options="montos_fijos" label="Monto ($)" outlined />
        </div>
        <div class="col-12 col-md-3">
          <q-select 
            v-model="formulario.motorista" 
            :options="opciones.motoristas" 
            label="Motorista" 
            outlined clearable 
            @update:model-value="limpiarError('motorista')"
            :error="errores.motorista"
            error-message="Seleccione un motorista"
          />
        </div>
      </div>

      <div class="row justify-end">
        <q-btn 
          color="primary" 
          icon="description" 
          label="Generar Documento" 
          size="lg" 
          @click="generarDocumento" 
          :loading="cargando"
        />
      </div>

      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import axios from 'axios'

const $q = useQuasar()

// Variables de estado
const misiones_fijas = [
  "ENTREGA DE EQUIPO INFORMATICO", 
  "ENTREGA DE DOCUMENTOS", 
  "MANTENIMIENTO PREVENTIVO DE VEHICULO", 
  "SOPORTE TÉCNICO MÓVIL A CENTROS ESCOLARES"
]
const montos_fijos = ["Ninguno", "5", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55", "60", "65", "70", "75", "80"]

// Aquí guardamos las listas que vienen del Excel
const opciones = reactive({
  destinos_originales: [],
  destinos_disponibles: [],
  sedes_originales: [],
  sedes_disponibles: [],
  personal_original: [],
  personal_disponible: [],
  motoristas: [],
  rutas_manuales_originales: [],
  rutas_manuales_disponibles: []
})

// Los datos exactos que llenará el usuario
const formulario = reactive({
  nombres: [],
  mision: null,
  destinos_ce: [],
  sedes: [],
  rutas_extra: [],
  lugar_salida: "Sede Soporte Técnico Santa Ana, Santa Ana",
  hora_salida: "07:30",
  fecha_emision: new Date().toISOString().split('T')[0],
  fecha_mision: null,
  clase_vehiculo: "Pickup",
  placa: null,
  monto: "Ninguno",
  motorista: null
})

const nuevaRuta = ref('')
const cargando = ref(false)
const guardandoRuta = ref(false)
const eliminandoRuta = ref(null)
const mostrarAgregarRuta = ref(false)
const inputFechaMision = ref(null)

const abrirPickerMision = () => {
  try {
    let nativeInput = null;
    
    // Método oficial de Quasar para obtener el input nativo
    if (inputFechaMision.value && typeof inputFechaMision.value.getNativeElement === 'function') {
      nativeInput = inputFechaMision.value.getNativeElement();
    } 
    // Alternativa manual en caso de fallback
    else if (inputFechaMision.value && inputFechaMision.value.$el) {
      nativeInput = inputFechaMision.value.$el.querySelector('input');
    }

    // Abrimos el selector si la función está disponible
    if (nativeInput && typeof nativeInput.showPicker === 'function') {
      nativeInput.showPicker();
    }
  } catch (error) {
    // Si el picker ya está abierto o no es compatible, ignoramos el error
    console.log("El picker ya está abierto o no es compatible", error);
  }
}

// Errores de validación
const errores = reactive({
  nombres: false,
  mision: false,
  destinos: false,
  fecha_mision: false,
  placa: false,
  motorista: false
})

// Limpiar error específico cuando el usuario modifica el campo
const limpiarError = (campo) => {
  errores[campo] = false
}

// Verificar si hay al menos un destino seleccionado
const hayDestinosSeleccionados = () => {
  const total = (formulario.destinos_ce?.length || 0) +
                (formulario.sedes?.length || 0) +
                (formulario.rutas_extra?.length || 0)
  return total > 0
}

// Funciones para actualizar listas disponibles (eliminar elementos seleccionados)
const actualizarListaPersonal = () => {
  const seleccionados = formulario.nombres || []
  opciones.personal_disponible = opciones.personal_original.filter(
    item => !seleccionados.includes(item)
  )
}

const actualizarListaDestinos = () => {
  const seleccionados = formulario.destinos_ce || []
  opciones.destinos_disponibles = opciones.destinos_originales.filter(
    item => !seleccionados.includes(item)
  )
}

const actualizarListaSedes = () => {
  const seleccionados = formulario.sedes || []
  opciones.sedes_disponibles = opciones.sedes_originales.filter(
    item => !seleccionados.includes(item)
  )
}

const actualizarListaRutasManuales = () => {
  const seleccionados = formulario.rutas_extra || []
  opciones.rutas_manuales_disponibles = opciones.rutas_manuales_originales.filter(
    item => !seleccionados.includes(item)
  )
}

// Función para limpiar todos los selectores (al generar documento)
const limpiarTodosLosSelectores = () => {
  actualizarListaPersonal()
  actualizarListaDestinos()
  actualizarListaSedes()
  actualizarListaRutasManuales()
}

const cargarDatosDesdeBackend = async () => {
  try {
    const respuesta = await axios.get('http://localhost:3000/api/datos')
    
    opciones.destinos_originales = respuesta.data.listaDestinos
    opciones.destinos_disponibles = [...respuesta.data.listaDestinos]
    
    opciones.sedes_originales = respuesta.data.listaSedes
    opciones.sedes_disponibles = [...respuesta.data.listaSedes]
    
    opciones.personal_original = respuesta.data.listaPersonal
    opciones.personal_disponible = [...respuesta.data.listaPersonal]
    
    opciones.motoristas = respuesta.data.listaMotoristas
    
    opciones.rutas_manuales_originales = respuesta.data.listaRutasManuales || []
    opciones.rutas_manuales_disponibles = [...(respuesta.data.listaRutasManuales || [])]
    
    $q.notify({ type: 'positive', message: 'Bases de datos cargadas correctamente', position: 'top-right' })
  } catch { 
    $q.notify({ type: 'negative', message: 'Error conectando al servidor...', position: 'top' })
  }
}

// Filtro buscador para los centros escolares
const filtrarDestinos = (val, update) => {
  const seleccionados = formulario.destinos_ce || []
  if (val === '') { 
    update(() => { 
      opciones.destinos_disponibles = opciones.destinos_originales.filter(
        item => !seleccionados.includes(item)
      )
    })
    return 
  }
  update(() => {
    const aguja = val.toLowerCase()
    opciones.destinos_disponibles = opciones.destinos_originales.filter(v => 
      v.toLowerCase().indexOf(aguja) > -1 && !seleccionados.includes(v)
    )
  })
}

// Agregar nueva ruta manual (permanentemente guardada en Excel)
const agregarRutaManual = async () => {
  if (nuevaRuta.value.trim() === '') {
    $q.notify({ type: 'warning', message: 'Por favor escriba una ruta válida', timeout: 2000 })
    return
  }
  
  if (opciones.rutas_manuales_originales.includes(nuevaRuta.value.trim())) {
    $q.notify({ type: 'warning', message: 'Esta ruta ya existe en el sistema', timeout: 2000 })
    return
  }
  
  guardandoRuta.value = true
  
  try {
    const response = await axios.post('http://localhost:3000/api/guardar-ruta', {
      ruta: nuevaRuta.value.trim()
    })
    
    if (response.data.success) {
      opciones.rutas_manuales_originales.push(nuevaRuta.value.trim())
      opciones.rutas_manuales_disponibles.push(nuevaRuta.value.trim())
      
      formulario.rutas_extra.push(nuevaRuta.value.trim())
      actualizarListaRutasManuales()
      
      nuevaRuta.value = ''
      
      $q.notify({ 
        type: 'positive', 
        message: 'Ruta guardada permanentemente en el sistema', 
        timeout: 2000,
        position: 'top-right'
      })
    }
  } catch (error) {
    console.error(error)
    let mensaje = 'Error al guardar la ruta'
    if (error.response && error.response.data && error.response.data.error) {
      mensaje = error.response.data.error
    }
    $q.notify({ type: 'negative', message: mensaje, timeout: 3000 })
  } finally {
    guardandoRuta.value = false
  }
}

// Eliminar una ruta manual del Excel (con confirmación)
const eliminarRuta = (ruta) => {
  $q.dialog({
    title: 'Confirmar eliminación',
    message: `¿Estás seguro de eliminar la ruta: "${ruta}"? Esta acción es permanente.`,
    persistent: true,
    ok: { label: 'Eliminar', color: 'negative' },
    cancel: { label: 'Cancelar', color: 'primary' }
  }).onOk(async () => {
    eliminandoRuta.value = ruta
    try {
      await axios.delete(`http://localhost:3000/api/eliminar-ruta/${encodeURIComponent(ruta)}`)
      
      // Actualizar listas locales
      opciones.rutas_manuales_originales = opciones.rutas_manuales_originales.filter(r => r !== ruta)
      opciones.rutas_manuales_disponibles = opciones.rutas_manuales_disponibles.filter(r => r !== ruta)
      formulario.rutas_extra = formulario.rutas_extra.filter(r => r !== ruta)
      actualizarListaRutasManuales()
      
      $q.notify({
        type: 'positive',
        message: 'Ruta eliminada correctamente',
        timeout: 2000,
        position: 'top-right'
      })
    } catch (error) {
      console.error(error)
      $q.notify({
        type: 'negative',
        message: error.response?.data?.error || 'Error al eliminar la ruta',
        timeout: 3000
      })
    } finally {
      eliminandoRuta.value = null
    }
  })
}

// Generar y descargar documento Word con validaciones visuales
const generarDocumento = async () => {
  // Validar campos
  errores.nombres = !formulario.nombres || formulario.nombres.length === 0
  errores.mision = !formulario.mision
  errores.destinos = !hayDestinosSeleccionados()
  errores.fecha_mision = !formulario.fecha_mision
  errores.placa = !formulario.placa
  errores.motorista = !formulario.motorista

  if (errores.nombres || errores.mision || errores.destinos || errores.fecha_mision || errores.placa || errores.motorista) {
    $q.notify({ type: 'negative', message: 'Corrige los campos marcados en rojo', position: 'top' })
    return
  }

  cargando.value = true

  try {
    const todos_destinos = [...(formulario.destinos_ce || []), ...(formulario.sedes || []), ...(formulario.rutas_extra || [])]
    const payload = { ...formulario, destinos: todos_destinos }

    const respuesta = await axios.post('http://localhost:3000/api/generar', payload, {
      responseType: 'blob' 
    })

    const url = window.URL.createObjectURL(new Blob([respuesta.data]))
    const enlace = document.createElement('a')
    enlace.href = url
    const fechaDescarga = formulario.fecha_mision.split('-').reverse().join('-') 
    enlace.setAttribute('download', `${formulario.placa} - Misión Oficial - ${fechaDescarga}.docx`)
    document.body.appendChild(enlace)
    enlace.click()
    
    enlace.parentNode.removeChild(enlace)
    window.URL.revokeObjectURL(url)

    $q.notify({ type: 'positive', message: 'Documento generado y descargado correctamente.' })

    // LIMPIEZA DEL FORMULARIO
    formulario.nombres = []
    formulario.mision = null
    formulario.destinos_ce = []
    formulario.sedes = []
    formulario.rutas_extra = []
    formulario.fecha_mision = null
    formulario.placa = null
    formulario.monto = "Ninguno"
    formulario.motorista = null
    
    limpiarTodosLosSelectores()

    // Reiniciar errores
    Object.keys(errores).forEach(key => errores[key] = false)

  } catch (error) {
    console.error(error)
    $q.notify({ type: 'negative', message: 'Hubo un error al generar el archivo en el servidor.' })
  } finally {
    cargando.value = false
  }
}

onMounted(() => {
  cargarDatosDesdeBackend()
})
</script>

<style scoped>
.page-background {
  /* Fondo celeste súper suave y sólido */
  background-color: #c8e4fa;
}

.form-card {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.8);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04) !important;
}

.custom-expansion :deep(.q-expansion-item__container) {
  border-radius: 12px;
  transition: all 0.3s ease;
}

.custom-expansion :deep(.q-expansion-item__header) {
  border-radius: 12px;
  background-color: #f0f4ff;
  margin: 4px 0;
}

.custom-expansion :deep(.q-expansion-item__header:hover) {
  background-color: #e6edff;
}

.custom-expansion :deep(.q-expansion-item__content) {
  padding-top: 12px;
}

.rounded-borders {
  border-radius: 8px;
  margin-bottom: 4px;
}
</style>
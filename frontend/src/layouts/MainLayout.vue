<template>
  <q-layout view="lHh Lpr lFf">
    <q-header class="custom-header text-white" elevated>
      <q-toolbar class="q-py-sm q-px-md">
        <!-- Ícono del sistema -->
        <q-btn flat round dense icon="directions_car" size="lg" class="q-mr-sm" />
        
        <!-- Título principal -->
        <q-toolbar-title class="text-weight-bold non-selectable" style="letter-spacing: 0.5px;">
          MINEDUCYT
          <span class="text-weight-regular text-subtitle1 q-ml-sm opacity-80 hidden-xs non-selectable" style="font-size: 0.9em">
            | Sistema de Solicitud de Transporte
          </span>
        </q-toolbar-title>

        <!-- Etiqueta de versión -->
        <q-chip outline color="white" text-color="white" size="sm" class="text-weight-bold" style="background: rgba(255,255,255,0.1)">
          V 1.0
        </q-chip>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
</script>

<style scoped>
.custom-header {
  /* Fondo degradado moderno en tonos azules institucionales */
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.95) 0%, rgba(21, 101, 192, 0.95) 100%);
  
  /* Efecto Glassmorphism sutil para cuando se hace scroll */
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  
  /* Sombra más elegante */
  box-shadow: 0 4px 20px rgba(25, 118, 210, 0.25) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.opacity-80 {
  opacity: 0.8;
}

/* Ocultar el texto secundario en pantallas muy pequeñas para evitar desbordes */
@media (max-width: 599px) {
  .hidden-xs {
    display: none;
  }
}
</style>

<template>
        <div v-if="hasStructure">
            <div class="events">
                <v-row class="mb-0 pt-2">
                    <p>Events</p>
                </v-row>
    
                <Seeker class="seeker" :ref="'seeker'+structure.name" :width="width" :height="heightOfStructure(structure)" />
               
            </div>
        </div>
</template>
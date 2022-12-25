function jump_video_to_time(time) {
    const video = document.querySelector('video')
    video.currentTime = time
    video.play()
}

// define component
Vue.component('annotations-nav-tab', {
    props: ['title', 'current_view', 'data_id', 'detected_features'],
    computed: {
        has_data: function () {
            return this.detected_features.includes(this.data_id)
        }
    },
    template: `
    <div class="nav-tab" v-bind:class="{selected:current_view == title, disabled:(!has_data)}">{{title}}
        <span v-if="has_data" class="material-icons">
            check_circle
        </span>
    </div>
    `
})

Vue.component('annotations-nav', {
    props: ['title_ids_dict', 'current_view', 'detected_features'],
    methods: {
        nav_clicked: function (title) {
            this.$emit('nav-clicked', title)
        },
    },
    template: `
    <div class="feature-tabs">
        <annotations-nav-tab v-for="id, title in title_ids_dict"
            v-bind:title="title" v-bind:data_id="id"
            v-bind:detected_features="detected_features" v-bind:current_view="current_view"
            v-on:click.native="nav_clicked(title)">
        </annotations-nav-tab>
    </div>
    `
})

var router = new VueRouter({
    mode: 'history',
    // routes: { path: '/match/:id', component: test_com}
});


var app = new Vue({
    router,
    el: '#app',
    data: {
        json_data: {},
        video_info: { width: 800, height: 500, length: 252 },
        video_length: 252,
        current_view: 'Label Detection',
        title_ids_dict: {
            "Label Detection": 'shot_label_annotations',
            'Shot Detection': 'shot_annotations',
            'Object Tracking': 'object_annotations',
            'Person Detection': 'person_detection_annotations',
            'Face Detection': 'face_detection_annotations',
            'Logo Recognition': 'logo_recognition_annotations',
            'Speech Transcription': 'speech_transcriptions',
            'Text Detection': 'text_annotations',
            'Explicit Content Detection': 'explicit_annotation'
        }
    }, methods: {
        jump_video: function (event_data) {
            document.querySelector('video').scrollIntoView({ 'behavior': 'smooth', 'block': 'center' })
            jump_video_to_time(event_data.seconds)
        },
        set_current_view: function (new_view) {
            this.current_view = new_view
            router.push({hash: '#'+new_view  })
        }
    },
    computed: {
        data_misaligned: function () {
            console.log('delt')
            if (this.json_data)
                if (this.json_data.annotation_results) {
                    const delta = this.video_info.length - this.json_data.annotation_results[0].segment.end_time_offset.seconds
                    console.log('delt', delta)
                    if (Math.abs(delta) > 2) {
                        return true
                    }
                }
            return false
        },
        detected_features: function () {
            var features = []
            if (!this.json_data.annotation_results)
                return features
            this.json_data.annotation_results.forEach(annotations => {
                console.log(Object.keys(annotations))
                features = features.concat(Object.keys(annotations))
            })
            return features
        }
    }
})

const URL = window.URL || window.webkitURL

function fetch_json(url) {
    //alert("`````getting json")
    var json = null
    $.ajax({
        'async': false,
        'url': url,
        'dataType': "json",
        'success': function (data) {
            json = data
        }
    })
    return json
}

function load_video_from_url(url) {
    video.src = url
}

function load_video_dragged(event) {
    const file = this.files[0]
    const file_url = URL.createObjectURL(file)
    updateValue()
    load_video_from_url(file_url)
}

function load_json_from_url(url) {
    var json = null
    $.ajax({
        'async': false,
        'url': url,
        'dataType': "json",
        'success': function (data) {
            json = data
        }
    })
    json_data = json
    console.log(json_data)
    app.json_data = json_data
}

function load_json_dragged(event) {
    const file = this.files[0]
    const file_url = URL.createObjectURL(file)
    load_json_from_url(file_url);
}

var json_data = {}
const video = document.getElementById('video')
const video_input = document.getElementById('video_input')
const json_input = document.getElementById('json_input')


video.oncanplay = function () {
    console.log("Can start playing video", video.duration, video.videoHeight, video.videoWidth)
    app.video_info.length = video.duration
    app.video_length.duration
    app.video_info.height = 500
    app.video_info.width = 800
}

function drag_enter(ev) {
    ev.preventDefault()
}

function drop_video(ev) {
    ev.preventDefault()
    video_input.files = ev.dataTransfer.files
    video_input.dispatchEvent(new Event('change'))

}

function drop_json(ev) {
    ev.preventDefault()
    json_input.files = ev.dataTransfer.files
    json_input.dispatchEvent(new Event('change'))
}

video_input.addEventListener('change', load_video_dragged, false)
json_input.addEventListener('change', load_json_dragged, false)

function updateValue(e) {
    var fullPath = document.getElementById('video_input').value;
    if (fullPath) {
        var startIndex = (fullPath.indexOf('\\') >= 0 ? fullPath.lastIndexOf('\\') : fullPath.lastIndexOf('/'));
        var filename = fullPath.substring(startIndex);
        var filename = filename.slice(0, filename.lastIndexOf(".")) //removing everything after . like .mp4
        if (filename.indexOf('\\') === 0 || filename.indexOf('/') === 0) {
            filename = filename.substring(1);
            filename = filename.concat(".json"); // Adding ".json" suffix to the name
        }
        getJson(filename);
        load_json_from_url(filename)
                        }
        }

function getJson(name) {
    const xhr = new XMLHttpRequest();
    xhr.open('POST','/get_json')
    //the route you want this data to handle
    xhr.setRequestHeader('Content-type', 'text/plain')
    xhr.send(name)
    xhr.onload = function(){

        if (xhr.status >= 200 && xhr.status < 300) {
            // parse JSON
            const response = JSON.parse(xhr.responseText);
            app.json_data = JSON.parse(xhr.responseText);
            console.log(response);
        }
    }
}

// check for hash code in url

if (app.$route.hash) {
    const hash_value = decodeURI(app.$route.hash.substring(1))
    if (hash_value in app.title_ids_dict){
        app.current_view = hash_value
    }
}
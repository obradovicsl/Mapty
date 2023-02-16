'use strict';



const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {

    id = Date.now();
    #date = new Date();

    constructor(coords, distance, duration) {
        this.coords = coords; // [lat, lon]
        this.distance = distance; //in km
        this.duration = duration; //in min
    }

    _displayMessage() {
        //Running on April 14
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        return `${this.type[0].toUpperCase() + this.type.slice(1)} on ${months[this.#date.getMonth()]} ${this.#date.getDate()}`;
    }
}

class Running extends Workout {
    type = 'running';

    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this.message = this._displayMessage();
    }

    calcPace() {
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends Workout {
    type = 'cycling';

    constructor(coords, distance, duration, elevation) {
        super(coords, distance, duration);
        this.elevation = elevation;
        this.calcSpeed();
        this.message = this._displayMessage();
    }

    calcSpeed() {
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

class App {
    #map;
    #mapE;
    #workouts = [];
    #mapZoom = 13;

    constructor() {
        this._getPosition();
        //Get local storage
        this._getLocalStorage();
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField);
        containerWorkouts.addEventListener('click', this._moveMap.bind(this));
    }

    _getPosition() {
        navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
            alert('Bad');
        });
    }

    _loadMap(position) {

        const { latitude } = position.coords;
        const { longitude } = position.coords;

        const mapLink = `https://www.google.com/maps/@${latitude},${longitude}`;

        const coords = [latitude, longitude];
        this.#map = L.map('map').setView(coords, this.#mapZoom);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach(work => { this._renderWorkoutMarker(work); })
    }

    _showForm(e) {
        this.#mapE = e;
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
        inputDistance.focus();
    }

    _newWorkout(e) {
        e.preventDefault();

        const isValid = function (...args) {
            return args.every(arg => Number.isFinite(arg));
        }

        const isPositive = function (...args) {
            return args.every(arg => arg > 0);
        }

        //Get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const { lat, lng } = this.#mapE.latlng;
        let coords = [lat, lng];
        let workout;

        //If activity is running, create running object
        if (type === 'running') {
            const cadence = +inputCadence.value;
            //Validate data

            if (!isValid(distance, duration, cadence)) return;
            if (!isPositive(distance, duration, cadence)) return;

            workout = new Running(coords, distance, duration, cadence);
        }

        //If activity is cycling, create cycling object
        if (type === 'cycling') {
            const elevation = +inputElevation.value;
            //Validate data

            if (!isValid(distance, duration, elevation)) return;
            if (!isPositive(distance, duration)) return;

            workout = new Cycling(coords, distance, duration, elevation);
        }

        //Add  new object to workouts

        this.#workouts.push(workout);

        //Show workout on the map

        this._renderWorkoutMarker(workout);

        //Add new object to the list
        this._renderWorkout(workout);

        //Clear input fields and close the form
        this._hideForm();

        //Update local storage
        this._setLocalStorage();
    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords)
            .addTo(this.#map)
            .bindPopup(
                L.popup({
                    autoClose: false,
                    closeOnClick: false,
                    className: `${workout.type}-popup`
                })
            )
            .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.message}`)
            .openPopup();
    }

    _renderWorkout(workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <h2 class="workout__title">${workout.message}</h2>
            <div class="workout__details">
                <span class="workout__icon"> ${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} </span>
                <span class="workout__value">${workout.distance}</span>
                <span class="workout__unit">km</span>
            </div >
            <div class="workout__details">
                <span class="workout__icon">⏱</span>
                <span class="workout__value">${workout.duration}</span>
                <span class="workout__unit">min</span>
            </div>
        `;

        if (workout.type === 'running') {
            html += `
            <div class="workout__details" >
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.pace.toFixed(1)}</span>
                <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">🦶🏼</span>
                <span class="workout__value">${workout.cadence}</span>
                <span class="workout__unit">spm</span>
            </div>
        </li >
            `;
        }


        if (workout.type === 'cycling') {
            html += `
            <div class="workout__details" >
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.speed.toFixed(1)}</span>
                <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⛰</span>
                <span class="workout__value">${workout.elevation}</span>
                <span class="workout__unit">m</span>
            </div>
        </li >
            `;
        }
        form.insertAdjacentHTML('afterend', html);
    }

    _hideForm() {
        inputDistance.value = inputDuration.value = inputElevation.value = inputCadence.value = '';
        inputCadence.blur();
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(function () {
            form.style.display = 'grid';
        }, 1000);
    }

    _moveMap(e) {
        const clicked = e.target.closest('.workout');
        if (!clicked?.classList.contains('workout')) return;

        const id = clicked.dataset.id;
        let workout = this.#workouts.find(work => work.id == id);
        console.log(workout);
        this.#map.setView(workout.coords, this.#mapZoom, {
            animation: true,
            pan: {
                duration: 1,
            }
        });
    }

    _setLocalStorage() {
        /*
            localStorage.setItem - po principu kljuc - vrednost 
            pod kljucem 'workouts' bice postavljena vrednost koju prosledimo
            JSON.stringify - prebacuje niz objekata u string
        */
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {

        const data = JSON.parse(localStorage.getItem('workouts'));

        if (!data) return;

        this.#workouts = data;

        this.#workouts.forEach(work => { this._renderWorkout(work); })
    }

    clearStorage() {
        localStorage.removeItem('workouts');
        location.reload();
    }

}

const app = new App();




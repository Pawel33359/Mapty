'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; //  [lat,lng]
    this.distance = distance; //  km
    this.duration = duration; //  min
  }

  _setDescritpion() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth() + 1]
    } ${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
  setId(id) {
    this.id = id;
  }
  setDate(date) {
    this.date = date;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescritpion();
  }

  calcPace() {
    // min/km
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
    this._setDescritpion();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

//////////////////////////////////////////////////////////////
//APPLICATION ARCHITECTURE
const form = document.querySelector('.form__add');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

//buttons
const deleteAll = document.querySelector('.delete__all');

//sort
const sortType = document.querySelector('.sort__type');
const sortNumbers = document.querySelector('.sort__numbers');

// const sortDistance = document.querySelector('.sort__distance');
// const sortDuration = document.querySelector('.sort__duration');
const sortCalculate = document.querySelector('.sort__calculate');
const sortSpecial = document.querySelector('.sort__special');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #markers = [];
  //Sorting variables
  #sortWorkouts;

  #type = ['all', 'running', 'cycling'];
  #curType = 0;

  #numType = ['', 'descending', 'ascending'];
  #curNumType = 0;
  #curNumSelected = '';

  constructor() {
    //Get user's position
    this._getPosition();

    // get data from local storage
    this._getLocalStorage();

    //Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    form.addEventListener('click', e => {
      //Check if user clicked on input fields to remove error message and classes
      if (e.target.className.includes('form__input')) this._hideError(form);
    });
    // Listen to type changes in add form
    inputType.addEventListener('change', () => {
      this._toggleElevationField(inputElevation, inputCadence);
    });
    // Listen to clicks on list
    containerWorkouts.addEventListener('click', e => {
      this._moveToPopup(e);
      this._showOptions(e);
    });
    // to buttons
    deleteAll.addEventListener('click', this._deleteAllWorkouts.bind(this));
    // to sorting options
    sortType.addEventListener('click', this._sortWorkoutsType.bind(this));
    sortNumbers.addEventListener('click', this._sortWorkoutsNumber.bind(this));
  }

  ////////////////////////////////////////////////////////////////////////////////////////
  // MAP
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
    }
  }

  _loadMap(position) {
    //   console.log(position);
    const { latitude, longitude } = position.coords;
    //   console.log(latitude, longitude);
    //   console.log(`https://www.google.pl/maps/@${latitude},${longitude}z`);

    const cords = [latitude, longitude];

    this.#map = L.map('map').setView(cords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // handling clicks on map
    this.#map.on('click', mapE => {
      this._hideOptions();
      this._hideEditForms();
      this._showForm(mapE);
    });

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }
  _renderWorkoutMarker(workout) {
    //Getting id and marker object to be able to delete it later
    const mark = {};
    mark.id = workout.id;

    mark.marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(`${workout.description}`)
      .openPopup();
    this.#markers.push(mark);
  }

  ////////////////////////////////////////////////////////////////////////////////////////
  // WORKOUT
  _newWorkout(e) {
    e.preventDefault();

    //Get Data from the form
    const { lat, lng } = this.#mapEvent.latlng;

    const workout = this._createWorkout(form, lat, lng);

    //Stop function if failed to create workout
    if (!workout) return;

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form and Clear input Fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();

    //clear Error just in case
    this._hideError(form);
  }
  _renderWorkout(workout) {
    if (!workout) return;

    let html = `<div class="complete"  data-type="${workout.type}">
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">Dis</span>
      <span class="workout__value distance">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">Dur</span>
      <span class="workout__value duration">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;

    if (workout.type === 'running')
      html += `<div class="workout__details">
        <span class="workout__icon calculate">Pac</span>
        <span class="workout__value calculate">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit calculate">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon special">Cad</span>
        <span class="workout__value special">${workout.cadence}</span>
        <span class="workout__unit special">spm</span>
      </div>`;

    if (workout.type === 'cycling')
      html += `<div class="workout__details">
        <span class="workout__icon calculate">Sp</span>
        <span class="workout__value calculate">${workout.speed.toFixed(
          1
        )}</span>
        <span class="workout__unit calculate">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon special">El</span>
        <span class="workout__value special">${workout.elevation}</span>
        <span class="workout__unit special">m</span>
      </div>`;

    html += `</li>
    <div class="options hidden">
    <button class="btn edit single">Edit</button>
    <button class="btn delete single">Delete</button>
    </div>`;

    html += `<form class="form form__edit hidden">
      <div class="form__row">
        <label class="form__label">Type</label>
        <select class="form__input form__input--type">
          <option value="running">Running</option>
          <option value="cycling">Cycling</option>
        </select>
      </div>
      <div class="form__row">
        <label class="form__label">Distance</label>
        <input class="form__input form__input--distance" placeholder="km" />
      </div>
      <div class="form__row">
        <label class="form__label">Duration</label>
        <input
          class="form__input form__input--duration"
          placeholder="min"
        />
      </div>
      <div class="form__row">
        <label class="form__label">Cadence</label>
        <input
          class="form__input form__input--cadence"
          placeholder="step/min"
        />
      </div>
      <div class="form__row form__row--hidden">
        <label class="form__label">Elev Gain</label>
        <input
          class="form__input form__input--elevation"
          placeholder="meters"
        />
      </div>
      <div class="error__message"></div>
      <button class="form__btn">OK</button>
  </form>
  <button class="btn cancel hidden">Cancel</button>
  </div>
    `;
    form.insertAdjacentHTML('afterend', html);

    //Prepare listener for edit Form
    this._editFormListener(workout.id);
  }
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // Using public interface
    // workout.click();
  }
  _createWorkout(formDoc, lat, lng) {
    // Get inputs from form
    const type = formDoc.querySelector('.form__input--type').value;
    const distance = +formDoc.querySelector('.form__input--distance').value;
    const duration = +formDoc.querySelector('.form__input--duration').value;
    const cadence = +formDoc.querySelector('.form__input--cadence').value;
    const elevation = +formDoc.querySelector('.form__input--elevation').value;

    let workout;
    // If running create running object
    if (type === 'running') {
      // Check if data is valid

      if (!this._checkErrorRunning(formDoc, distance, duration, cadence))
        return;

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If cycling create cycling object
    if (type === 'cycling') {
      // Check if data is valid
      if (!this._checkErrorCycling(formDoc, distance, duration, elevation))
        return;

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    return workout;
  }
  ////////////////////////////////////////////////////////////////////////////////////////
  // SHOW ELEMENTS
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _showOptions(e) {
    // Prepare guard
    const workDoc = e.target.closest('.complete');
    // return if clicked on wrong place
    if (!workDoc) return;
    if (e.target.className.includes('form')) return;
    // find options
    const opt = workDoc.querySelector('.options');
    //Checking if edit button was clicked on
    if (e.target.className.includes(' edit ')) {
      this._setForEdit(workDoc);
    }
    //Checking if delete button was clicked on
    else if (e.target.className.includes(' delete ')) {
      this._setForDelete(workDoc);
    }
    //Checking if cancel button was clicked on
    else if (e.target.className.includes('cancel')) {
      this._hideEditForm(workDoc);
    } else {
      //hide all options, and forms and show options
      this._hideOptions();
      this._hideForm();
      this._hideEditForms();
      opt.classList.remove('hidden');
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////
  // HIDE ELEMENTS
  _hideForm() {
    //Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    // Hide Error
    this._hideError(form);

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  // Showing options on workout details
  _hideOptions() {
    const options = document.querySelectorAll('.options');
    options.forEach(opt => {
      opt.classList.add('hidden');
    });
  }
  //Hide workout before showing edit form
  _hideWorkout(workDoc) {
    workDoc.querySelector('.workout').classList.add('hidden');
    workDoc.querySelector('.options').classList.add('hidden');
  }
  // Hide edit form
  _hideEditForms() {
    document.querySelectorAll('.complete').forEach(workDoc => {
      this._hideEditForm(workDoc);
    });
  }
  _hideEditForm(workDoc) {
    const workout = workDoc.querySelector('.workout');
    const formEdit = workDoc.querySelector('.form__edit');
    const cancelBtn = workDoc.querySelector('.cancel');

    const inputDistanceEdit = formEdit.querySelector('.form__input--distance');
    const inputDurationEdit = formEdit.querySelector('.form__input--duration');
    const inputCadenceEdit = formEdit.querySelector('.form__input--cadence');
    const inputElevationEdit = formEdit.querySelector(
      '.form__input--elevation'
    );

    inputDistanceEdit.value =
      inputDurationEdit.value =
      inputCadenceEdit.value =
      inputElevationEdit.value =
        '';

    workout.classList.remove('hidden');
    formEdit.classList.add('hidden');
    cancelBtn.classList.add('hidden');
  }

  // //hiding all unwanted workouts for sorting
  // _hideAllCompleteWorkout(){

  // }
  ////////////////////////////////////////////////////////////////////////////////////////
  // SORT ELEMENTS
  _sortWorkoutsType() {
    //Change by what type workout will be sorted
    this.#curType = this.#curType >= 2 ? 0 : ++this.#curType;

    //Change sorting names
    this._changeSortTypeName();
    this._changeSortNumberNames();

    const sortedWorkouts = this._sortByType();
    this._sortByNumber(sortedWorkouts);
  }
  _sortWorkoutsNumber(e) {
    if (!e.target.className.includes('to__sort')) return;

    // set class initials for checking
    const sortNumClass = e.target.className.split(' ')[0];

    // Check if not clicked on other sorting option If so then start counting from beginning
    if (sortNumClass !== this.#curNumSelected) this.#curNumType = 0;
    this.#curNumType = this.#curNumType >= 2 ? 0 : ++this.#curNumType;

    // Set current sort selected
    this.#curNumSelected = this.#numType[this.#curNumType] ? sortNumClass : '';

    //Clear ascending and descending classes from all elements
    this._clearSortNumberClass();

    //Add correct class to correct element
    this.#numType[this.#curNumType] &&
      document
        .querySelector(`.${sortNumClass}`)
        .classList.add(`${this.#numType[this.#curNumType]}`);

    this._sortByNumber(this.#sortWorkouts);
  }

  _sortByType() {
    let sortedWorkouts;

    if (this.#curType === 0) {
      //show all type of sorts
      sortedWorkouts = this.#workouts;
      //clear special workout numbers option if for all
      this._clearSpecialSortClass();
    } else {
      //show type depending on sort
      sortedWorkouts = this.#workouts.filter(
        work => work.type === this.#type[this.#curType]
      );
    }

    return sortedWorkouts;
  }
  _sortByNumber(workouts) {
    // Set by what list needs to be sorted
    let sortedBy;
    switch (this.#curNumSelected) {
      case 'sort__distance':
        sortedBy = 'distance';
        break;
      case 'sort__duration':
        sortedBy = 'duration';
        break;
      case 'sort__calculate':
        sortedBy = sortCalculate.textContent.toLowerCase();
        break;
      case 'sort__special':
        sortedBy = sortSpecial.textContent.toLowerCase();
        break;
      default:
        sortedBy = '';
    }

    // Sort workouts
    const sortedWorkouts = [...workouts].sort((a, b) => {
      if (this.#numType[this.#curNumType] === 'descending')
        return a[sortedBy] - b[sortedBy];
      if (this.#numType[this.#curNumType] === 'ascending')
        return b[sortedBy] - a[sortedBy];
      // If there is no sort option then sort by date
      if (this.#numType[this.#curNumType] === '')
        return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    //Set new sorted Workouts array
    this.#sortWorkouts = sortedWorkouts;

    //Show rendered workouts on list
    this._renderSortedWorkouts(sortedWorkouts);
  }

  _renderSortedWorkouts(sortedWorkouts) {
    //Clear workouts from the list
    this._clearWorkoutsList();

    // render sorted workouts
    sortedWorkouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  _clearWorkoutsList() {
    document.querySelectorAll('.complete').forEach(work => work.remove());
  }
  _clearSortNumberClass() {
    const arrSortNum = Array.from(sortNumbers.children);

    arrSortNum.forEach(sort => {
      sort.classList.remove('descending');
      sort.classList.remove('ascending');
    });
  }
  _clearSpecialSortClass() {
    //clear classess from special sorting options
    sortCalculate.classList.remove('descending');
    sortCalculate.classList.remove('ascending');

    sortSpecial.classList.remove('descending');
    sortSpecial.classList.remove('ascending');

    //clear special sorting options values
    if (
      this.#curNumSelected === 'sort__calculate' ||
      this.#curNumSelected === 'sort__special'
    ) {
      this.#curNumType = 0;
      this.#curNumSelected = '';
    }
  }

  _changeSortTypeName() {
    // Get sort name with firts letter in upper case
    const sortName =
      this.#type[this.#curType][0].toUpperCase() +
      this.#type[this.#curType].slice(1);
    sortType.textContent = sortName;
    //Change color of text to match typing
    if (this.#type[this.#curType] === 'all') sortType.style.color = '#ececec';
    if (this.#type[this.#curType] === 'running')
      sortType.style.color = '#00c46a';
    if (this.#type[this.#curType] === 'cycling')
      sortType.style.color = '#ffb545';
  }
  _changeSortNumberNames() {
    //Remove specific sort names and make them hidden
    if (this.#type[this.#curType] === 'all') {
      sortCalculate.textContent = '';
      sortSpecial.textContent = '';
      sortCalculate.classList.add('hidden');
      sortSpecial.classList.add('hidden');
    } else {
      // Make specific sort names and make them visible
      if (this.#type[this.#curType] === 'running') {
        sortCalculate.textContent = 'Pace';
        sortSpecial.textContent = 'Cadence';
      }
      if (this.#type[this.#curType] === 'cycling') {
        sortCalculate.textContent = 'Speed';
        sortSpecial.textContent = 'Elevation';
      }
      sortCalculate.classList.remove('hidden');
      sortSpecial.classList.remove('hidden');
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////
  // AFTER CLICKING BUTTONS SET FORM
  _setForEdit(workDoc) {
    this._hideWorkout(workDoc);
    workDoc.querySelector('.form__edit').classList.remove('hidden');
    workDoc.querySelector('.cancel').classList.remove('hidden');

    //Set distance and duration inputs to current workout ones
    workDoc.querySelector('.form__input--distance').value =
      +workDoc.querySelector('.distance').textContent;
    workDoc.querySelector('.form__input--duration').value =
      +workDoc.querySelector('.duration').textContent;

    //Set special input depending on type
    const cadence = workDoc.querySelector('.form__input--cadence');
    const elevation = workDoc.querySelector('.form__input--elevation');
    if (workDoc.dataset.type === 'running')
      cadence.value = +workDoc.querySelector('.workout__value.special')
        .textContent;
    if (workDoc.dataset.type === 'cycling') {
      //if cycling change type name and change cadence to elevation
      workDoc.querySelector('.form__input--type').value = workDoc.dataset.type;
      this._toggleElevationField(elevation, cadence);
      elevation.value = +workDoc.querySelector('.workout__value.special')
        .textContent;
    }
  }
  _setForDelete(workDoc) {
    //get Workout from dom and then get that doc from array
    const workout = workDoc.querySelector('.workout');
    const work =
      this.#workouts[
        this.#workouts.findIndex(w => w.id === workout.dataset.id)
      ];
    //Deleting workout details and markers
    this._deleteWorkoutDetails(work);
    this._deleteMarker(work);
    //setting local storage
    this._setLocalStorage();
  }

  ////////////////////////////////////////////////////////////////////////////////////////
  // TOGGLE OPTIONS

  _toggleElevationField(inputEl, inputCa) {
    inputEl.closest('.form__row').classList.toggle('form__row--hidden');
    inputCa.closest('.form__row').classList.toggle('form__row--hidden');
  }

  ////////////////////////////////////////////////////////////////////////////////////////
  // EDIT ELEMENTS
  _editFormListener(id) {
    //Get edit form for right workout
    const formDoc = document
      .querySelector(`[data-id='${id}']`)
      .closest('.complete')
      .querySelector('.form__edit');

    //Add event Listener to edit form
    formDoc.addEventListener('submit', e => {
      e.preventDefault();
      this._editWorkout(formDoc, id);
    });

    //Add event listener to enable changing type of exercise
    formDoc
      .querySelector('.form__input--type')
      .addEventListener('change', () => {
        const inputEl = formDoc.querySelector('.form__input--elevation');
        const inputCa = formDoc.querySelector('.form__input--cadence');
        this._toggleElevationField(inputEl, inputCa);
      });

    //Add event listener to clicks on input elements to remove error
    formDoc.addEventListener('click', e => {
      //Check if user clicked on input fields to remove error message and classes
      if (e.target.className.includes('form__input')) this._hideError(formDoc);
    });
  }
  _editWorkout(formDoc, id) {
    //Get
    const workDoc = document
      .querySelector(`[data-id='${id}']`)
      .closest('.complete');

    //Get work element from array and lat and lng of marker
    const work = this.#workouts[this.#workouts.findIndex(w => w.id === id)];
    const [lat, lng] = work.coords;

    //create new object
    const workout = this._createWorkout(formDoc, lat, lng);

    //Stop function if failed to create workout
    if (!workout) return;

    // Set previous id
    workout.setId(id);
    workout.setDate(work.date);

    //remove old workout from array
    this.#workouts.splice(this.#workouts.indexOf(work), 1);

    //add edited workout to array
    this.#workouts.push(workout);

    //Edit workout info in the list
    this._editWorkoutDetails(workDoc, workout);

    //Delete old marker and replace it with new
    this._deleteMarker(workout);
    this._renderWorkoutMarker(workout);

    this._hideEditForm(workDoc);

    // Set local storage to all workouts
    this._setLocalStorage();

    //Sort workouts for current sort option
    const sortedWorkouts = this._sortByType();
    this._sortByNumber(sortedWorkouts);
  }

  _editWorkoutDetails(workDoc, work) {
    // Get workout details Element
    const workout = workDoc.querySelector('.workout');

    //Change type to edited
    workout.classList.remove('workout--running');
    workout.classList.remove('workout--cycling');
    workout.classList.add(`workout--${work.type}`);

    //Change title of the description
    workout.querySelector('.workout__title').textContent = work.description;

    //Change distance and duration
    workout.querySelector('.distance').textContent = work.distance;
    workout.querySelector('.duration').textContent = work.duration;

    //Change value that is calculated(different for different types)
    const iconC = work.type === 'running' ? 'Pac' : 'Sp';
    const valueC =
      work.type === 'running' ? work.pace.toFixed(1) : work.speed.toFixed(1);
    const unitC = work.type === 'running' ? 'min/km' : 'km/h';
    this._editWorkoutSpecialDetails(workout, 'calculate', iconC, valueC, unitC);

    //Change value that is special to type
    const iconS = work.type === 'running' ? 'Cad' : 'El';
    const valueS = work.type === 'running' ? work.cadence : work.elevation;
    const unitS = work.type === 'running' ? 'spm' : 'm';
    this._editWorkoutSpecialDetails(workout, 'special', iconS, valueS, unitS);
  }

  _editWorkoutSpecialDetails(workout, specialClass, icon, value, unit) {
    workout.querySelector(`.workout__icon.${specialClass}`).textContent = icon;
    workout.querySelector(`.workout__value.${specialClass}`).textContent =
      value;
    workout.querySelector(`.workout__unit.${specialClass}`).textContent = unit;
  }

  ////////////////////////////////////////////////////////////////////////////////////////
  // DELETE ELEMENTS
  _deleteAllWorkouts() {
    // To delete all workouts you need to reverse it or forEach function wont work
    //(it will stop half short)
    const revWorkouts = [...this.#workouts].reverse();
    revWorkouts.forEach(work => {
      this._deleteWorkoutDetails(work);
      this._deleteMarker(work);
    });
    localStorage.removeItem('workouts');
  }
  _deleteWorkoutDetails(work) {
    this.#workouts.splice(this.#workouts.indexOf(work), 1);
    const workout = document
      .querySelector(`[data-id='${work.id}']`)
      .closest('.complete');
    workout.remove();
  }
  _deleteMarker(work) {
    const markToDelete = this.#markers.find(mark => mark.id === work.id);
    this.#map.removeLayer(markToDelete.marker);
  }
  ////////////////////////////////////////////////////////////////////////////////////////
  // ERROR HANDLING
  _checkErrorRunning(formDoc, distance, duration, cadence) {
    //Check if distance and duration is correct
    let errorList = this._checkErrorBasics(distance, duration);
    //Check cadence
    if (!this._checkIfValid(cadence)) errorList.push('cadence');

    //Handle whatever errors had occured
    return this._handleError(errorList, formDoc);
  }
  _checkErrorCycling(formDoc, distance, duration, elevation) {
    //Check if distance and duration is correct
    let errorList = this._checkErrorBasics(distance, duration);
    //Check cadence
    if (!this._checkIfValid(elevation)) errorList.push('elevation');

    //Handle whatever errors had occured
    return this._handleError(errorList, formDoc);
  }
  _checkErrorBasics(distance, duration) {
    let errorList = [];
    if (!this._checkIfValid(distance)) errorList.push('distance');
    if (!this._checkIfValid(duration)) errorList.push('duration');
    return errorList;
  }
  _checkIfValid(val) {
    return Number.isFinite(val) && val > 0;
  }
  _handleError(errorList, formDoc) {
    //Stop function if there are no errors
    if (errorList.length === 0) return true;

    let errorMessage = 'Incorrect inputs for: ';

    errorList.forEach((err, i, arr) => {
      //Check what to add to error message
      if (arr.length === 1) errorMessage += `${errorList[0]}`;
      else {
        if (i < arr.length - 2) errorMessage += `${err}, `;
        if (i === arr.length - 2) errorMessage += `${err} and `;
        if (i === arr.length - 1) errorMessage += `${err}!`;
      }
      //Add error class to right input field
      formDoc.querySelector(`.form__input--${err}`).classList.add('error');
    });

    formDoc.querySelector('.error__message').textContent = errorMessage;

    return false;
  }
  _hideError(formDoc) {
    formDoc.querySelector('.form__input--distance').classList.remove('error');
    formDoc.querySelector('.form__input--duration').classList.remove('error');
    formDoc.querySelector('.form__input--cadence').classList.remove('error');
    formDoc.querySelector('.form__input--elevation').classList.remove('error');
    formDoc.querySelector('.error__message').textContent = '';
  }

  ////////////////////////////////////////////////////////////////////////////////////////
  // LOCAL STORAGE
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });

    //
    this.#sortWorkouts = this.#workouts;
  }
}

const app = new App();

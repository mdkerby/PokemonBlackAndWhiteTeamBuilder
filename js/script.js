const CACHE_KEY = "gen5_pokemon_data";
const CACHE_VERSION_KEY = "gen5_cache_version";
const CACHE_VERSION = 1;

const GEN5_START = 494;
const GEN5_END = 649;
const team = new Array(6).fill(null);
const TYPE_CHART = {
    normal:   { weak: ["fighting"], resist: [], immune: ["ghost"] },
    fire:     { weak: ["water", "ground", "rock"], resist: ["fire", "grass", "ice", "bug", "steel", "fairy"], immune: [] },
    water:    { weak: ["electric", "grass"], resist: ["fire", "water", "ice", "steel"], immune: [] },
    electric: { weak: ["ground"], resist: ["electric", "flying", "steel"], immune: [] },
    grass:    { weak: ["fire", "ice", "poison", "flying", "bug"], resist: ["water", "electric", "grass", "ground"], immune: [] },
    ice:      { weak: ["fire", "fighting", "rock", "steel"], resist: ["ice"], immune: [] },
    fighting: { weak: ["flying", "psychic", "fairy"], resist: ["bug", "rock", "dark"], immune: [] },
    poison:   { weak: ["ground", "psychic"], resist: ["grass", "fighting", "poison", "bug", "fairy"], immune: [] },
    ground:   { weak: ["water", "grass", "ice"], resist: ["poison", "rock"], immune: ["electric"] },
    flying:   { weak: ["electric", "ice", "rock"], resist: ["grass", "fighting", "bug"], immune: ["ground"] },
    psychic:  { weak: ["bug", "ghost", "dark"], resist: ["fighting", "psychic"], immune: [] },
    bug:      { weak: ["fire", "flying", "rock"], resist: ["grass", "fighting", "ground"], immune: [] },
    rock:     { weak: ["water", "grass", "fighting", "ground", "steel"], resist: ["normal", "fire", "poison", "flying"], immune: [] },
    ghost:    { weak: ["ghost", "dark"], resist: ["poison", "bug"], immune: ["normal", "fighting"] },
    dragon:   { weak: ["ice", "dragon", "fairy"], resist: ["fire", "water", "electric", "grass"], immune: [] },
    dark:     { weak: ["fighting", "bug", "fairy"], resist: ["ghost", "dark"], immune: ["psychic"] },
    steel:    { weak: ["fire", "fighting", "ground"], resist: ["normal", "grass", "ice", "flying", "psychic", "bug", "rock", "dragon", "steel", "fairy"], immune: ["poison"] },
    fairy:    { weak: ["poison", "steel"], resist: ["fighting", "bug", "dark"], immune: ["dragon"] }
  };
const teamContainer = document.getElementById("team");
async function fetchLocationEncounters(url) {
  const response = await fetch(url);
  const data = await response.json();

  return data
    .map(encounter => {
      const bwDetails = encounter.version_details.find(v =>
        v.version.name === "black" || v.version.name === "white"
      );

      if (!bwDetails) return null;

      return {
        location: encounter.location_area.name
          .replace(/-/g, " ")
          .replace(/\b\w/g, l => l.toUpperCase()),
        minLevel: bwDetails.encounter_details[0]?.min_level,
        maxLevel: bwDetails.encounter_details[0]?.max_level,
        method: bwDetails.encounter_details[0]?.method.name
      };
    })
    .filter(Boolean);
}
function calculatePokemonEffectiveness(types) {
    const result = {};
  
    Object.keys(TYPE_CHART).forEach(attackType => {
      let multiplier = 1;
  
      types.forEach(defType => {
        const chart = TYPE_CHART[defType];
  
        if (chart.immune.includes(attackType)) multiplier *= 0;
        else if (chart.weak.includes(attackType)) multiplier *= 2;
        else if (chart.resist.includes(attackType)) multiplier *= 0.5;
      });
  
      result[attackType] = multiplier;
    });
  
    return result;
  }
  function calculateTeamWeakness(team) {
    const totals = {};
  
    Object.keys(TYPE_CHART).forEach(type => {
      totals[type] = {
        weak: 0,
        resist: 0,
        immune: 0
      };
    });
  
    team.forEach(pokemon => {
      if (!pokemon) return;
  
      const effectiveness = calculatePokemonEffectiveness(pokemon.types);
  
      Object.entries(effectiveness).forEach(([type, multiplier]) => {
        if (multiplier === 0) totals[type].immune++;
        else if (multiplier > 1) totals[type].weak++;
        else if (multiplier < 1) totals[type].resist++;
      });
    });
  
    return totals;
  }
  
async function loadPokemonData() {
    const cachedData = localStorage.getItem(CACHE_KEY);
    const cachedVersion = localStorage.getItem(CACHE_VERSION_KEY);
  
    // Use cache if valid
    if (cachedData && cachedVersion == CACHE_VERSION) {
      console.log("Loaded Pokémon from cache");
      return JSON.parse(cachedData);
    }
  
    console.log("Fetching Pokémon from PokéAPI...");
    const pokemonList = [];
  
    for (let id = GEN5_START; id <= GEN5_END; id++) {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
      const data = await response.json();
      data.name = data.name.charAt(0).toUpperCase()+ data.name.slice(1);
      pokemonList.push({
        id,
        name: data.name.split("-")[0],
        sprite: data.sprites.front_default,
        types: data.types.map(t => t.type.name),
        encountersUrl: data.location_area_encounters
      });
    }

    // Save to cache
    localStorage.setItem(CACHE_KEY, JSON.stringify(pokemonList));
    localStorage.setItem(CACHE_VERSION_KEY, CACHE_VERSION);
  
    return pokemonList;
  }
async function fetchGen5Pokemon() {
  const pokemonList = [];

  for (let id = GEN5_START; id <= GEN5_END; id++) {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    const data = await response.json();

    pokemonList.push({
      name: data.name,
      sprite: data.sprites.front_default
    });
  }

  createTeamSlots(pokemonList);
}
function updateWeaknessChart() {
    const chart = document.getElementById("weakness-chart");
    chart.innerHTML = "";
  
    const totals = calculateTeamWeakness(team);
  
    Object.entries(totals).forEach(([type, data]) => {
      const row = document.createElement("div");
      row.className = "weakness-row";
  
      row.innerHTML = `
        <strong class="type ${type}">${type}</strong>
        <span>Weak: ${data.weak}</span>
        <span>Resist: ${data.resist}</span>
        <span>Immune: ${data.immune}</span>
      `;
  
      chart.appendChild(row);
    });
  }
  

  function createTeamSlots(pokemonList) {
    for (let i = 1; i <= 6; i++) {
      const slot = document.createElement("div");
      slot.className = "slot";
  
      const encounterContainer = document.createElement("div");
      encounterContainer.className = "encounters";
  
      const label = document.createElement("label");
      label.textContent = `Team Member ${i}`;
  
      const picker = document.createElement("div");
      picker.className = "pokemon-picker";
  
      const img = document.createElement("img");
      img.style.width = "96px";
      img.style.display = "block";
      img.style.margin = "8px auto";
  
      const typeContainer = document.createElement("div");
      typeContainer.className = "types";
  
      pokemonList.forEach(pokemon => {
        const row = document.createElement("div");
        row.className = "pokemon-option";
  
        const sprite = document.createElement("img");
        sprite.src = pokemon.sprite;
        sprite.alt = pokemon.name;
  
        const name = document.createElement("span");
        name.textContent = pokemon.name;
  
        row.append(sprite, name);
  
        row.addEventListener("click", async () => {
          img.src = pokemon.sprite;
  
          typeContainer.innerHTML = "";
          pokemon.types.forEach(type => {
            const span = document.createElement("span");
            span.textContent = type;
            span.className = `type ${type}`;
            typeContainer.appendChild(span);
          });
  
          team[i - 1] = pokemon;
          updateWeaknessChart();
  
          encounterContainer.innerHTML = "Loading encounters...";
  
          if (!pokemon.encounters) {
            pokemon.encounters = await fetchLocationEncounters(pokemon.encountersUrl);
          }
  
          encounterContainer.innerHTML = "";
  
          if (pokemon.encounters.length === 0) {
            encounterContainer.textContent = "No wild encounters in Black/White";
          } else {
            pokemon.encounters
              .slice(0, 5)
              .forEach(e => {
                const div = document.createElement("div");
                div.className = "encounter-row";
                div.textContent = `${e.location} — Lv ${e.minLevel} (${e.method})`;
                encounterContainer.appendChild(div);
              });
          }
        });
  
        picker.appendChild(row);
      });
  
      slot.append(label, picker, img, typeContainer, encounterContainer);
      teamContainer.appendChild(slot);
    }
  }
  async function init() {
    const pokemonList = await loadPokemonData();
    createTeamSlots(pokemonList);
  }
  
  function clearCache() {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_VERSION_KEY);
    location.reload();
  }




  init();
  

  



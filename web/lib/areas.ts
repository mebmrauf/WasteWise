export interface ServiceAreaGroup {
  region: string;
  areas: string[];
}

export const DHAKA_SERVICE_AREAS: ServiceAreaGroup[] = [
  {
    region: "Uttara & Airport Area",
    areas: ["Uttara", "Abdullahpur", "Uttarkhan", "Dakshinkhan", "Bawnia", "Khilkhet"]
  },
  {
    region: "Mirpur & Pallabi",
    areas: ["Mirpur", "Pallabi", "Kazipara", "Kafrul", "Agargaon", "Gabtali"]
  },
  {
    region: "Mohammadpur & Adabor",
    areas: ["Mohammadpur", "Adabor", "Bochila", "Sher-e-Bangla Nagar"]
  },
  {
    region: "Tejgaon & Central-North Dhaka",
    areas: ["Tejgaon", "Farmgate", "Mohakhali", "Cantonment", "Banani"]
  },
  {
    region: "Gulshan & Baridhara",
    areas: ["Gulshan", "Niketan", "Baridhara", "Shahjadpur", "Badda", "Satarkul", "Beraid", "Bashundhara"]
  },
  {
    region: "Rampura, Khilgaon & Banasree",
    areas: ["Rampura", "Banasree", "Aftab Nagar", "Khilgaon", "Vatara"]
  },
  {
    region: "Dhanmondi & Central-South Dhaka",
    areas: ["Dhanmondi", "Kalabagan", "Jigatola", "Hazaribagh", "Paribagh", "Shahbagh", "Ramna", "Segunbagicha"]
  },
  {
    region: "Paltan, Motijheel & Commercial Dhaka",
    areas: ["Paltan", "Kakrail", "Motijheel", "Kamalapur", "Gulistan"]
  },
  {
    region: "Old Dhaka",
    areas: ["Lalbagh", "Kamrangirchar", "Kotwali", "Islampur", "Sadarghat", "Bangla Bazar", "Nimtoli", "Wari", "Sutrapur"]
  },
  {
    region: "Jatrabari & South-East Dhaka",
    areas: ["Jatrabari", "Shonir Akhra", "Jurain", "Shyampur", "Demra", "Matuail", "Signboard", "Japani Bazar"]
  },
  {
    region: "Savar Area",
    areas: ["Savar", "Ashulia", "Birulia"]
  },
  {
    region: "Keraniganj Area",
    areas: ["Jinjira", "Hasnabad", "Tegharia", "Jhilmil"]
  },
  {
    region: "Gazipur District",
    areas: ["Tongi", "Gazipur"]
  },
  {
    region: "Narayanganj District",
    areas: ["Fatullah", "Narayanganj", "Siddhirganj", "Purbachal"]
  }
];

export const ALL_SERVICE_AREAS = DHAKA_SERVICE_AREAS.flatMap(group => group.areas);

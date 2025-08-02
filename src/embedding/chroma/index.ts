import { ChromaClient } from "chromadb";
import { OpenAI } from "openai";
import { OpenAIEmbeddingFunction } from "@chroma-core/openai";

const chroma = new ChromaClient({
  host: "localhost",
  port: 8000,
});

const embeddingFunction = new OpenAIEmbeddingFunction({
  apiKey: process.env.OPENAI_API_KEY,
  modelName: "text-embedding-3-small",
});

export const createCollection = async () => {
  try {
    const collection = await chroma.createCollection({ name: "data-test" });

    console.log(collection);
  } catch (error) {
    console.log("ERROR -----> ");
    console.error(error);
  }
};

const getCollection = async () => {
  const collection = await chroma.getCollection({
    name: "data-test",
    embeddingFunction,
  });
  return collection;
};

export async function populateCollection() {
  const info = `One Piece is a legendary Japanese manga and anime series created by Eiichiro Oda, following the adventures of Monkey D. Luffy and his pirate crew, the Straw Hat Pirates, as they search for the ultimate treasure, the "One Piece," to become the King of the Pirates. Set in a vast world of oceans, islands, and factions like the Marines, Yonko (Emperors), and Revolutionary Army, the story explores themes of freedom, friendship, and justice. Luffy, who gains rubber-like abilities after eating the Gomu Gomu no Mi (Gum-Gum Fruit), recruits diverse crewmates like Zoro, Nami, Sanji, and others, each with unique skills and dreams. The series is famous for its world-building, long-running mysteries (e.g., Void Century, Will of D.), and epic battles (e.g., Marineford, Wano Arc). With over 1,100+ manga chapters and 1,000+ anime episodes, One Piece remains one of the most influential and bestselling franchises globally.`;
  const collection = await getCollection();
  await collection.add({
    documents: [info],
    ids: [`${Math.floor(Math.random() * 1_0000_0000_000)}`],
  });
}

export async function askQuestion(question: string) {
  const collection = await getCollection();
  const result = await collection.query({
    queryTexts: [question],
    nResults: 1,
  });
  const relevantInfo = result.documents[0][0];
  if (relevantInfo) {
    const openai = new OpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "assistant",
          content: `Answer the next question using this information: ${relevantInfo}.If question is out of context than reply in a professional way that i have no knowledge about this sorry.`, // context injection
        },
        {
          role: "user",
          content: question,
        },
      ],
    });
    const responseMessage = response.choices[0].message;
    console.log(responseMessage.content);
  }
}

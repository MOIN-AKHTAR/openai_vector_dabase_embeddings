import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export const createIndex = async () => {
  try {
    await pc.createIndex({
      name: "my-cool-index",
      dimension: 1536,
      metric: "cosine",
      spec: {
        serverless: {
          cloud: "aws",
          region: "us-east-1",
        },
      },
    });
  } catch (error) {
    console.error("ERROR -----------> ");
    console.error(error);
  }
};

function getIndex() {
  const index = pc.index("my-cool-index");
  return index;
}

export const embedDataIntoPinecone = async () => {
  try {
    const index = getIndex();

    if (!index) throw new Error("No index found");
    const info = `One Piece is a legendary Japanese manga and anime series created by Eiichiro Oda, following the adventures of Monkey D. Luffy and his pirate crew, the Straw Hat Pirates, as they search for the ultimate treasure, the "One Piece," to become the King of the Pirates. Set in a vast world of oceans, islands, and factions like the Marines, Yonko (Emperors), and Revolutionary Army, the story explores themes of freedom, friendship, and justice. Luffy, who gains rubber-like abilities after eating the Gomu Gomu no Mi (Gum-Gum Fruit), recruits diverse crewmates like Zoro, Nami, Sanji, and others, each with unique skills and dreams. The series is famous for its world-building, long-running mysteries (e.g., Void Century, Will of D.), and epic battles (e.g., Marineford, Wano Arc). With over 1,100+ manga chapters and 1,000+ anime episodes, One Piece remains one of the most influential and bestselling franchises globally.`;
    const embedding = await openai.embeddings.create({
      input: info,
      model: "text-embedding-3-small",
    });

    const id = `${Math.floor(Math.random() * 1_0000_0000_0000)}`;

    const result = await index.upsert([
      {
        id,
        values: embedding.data[0].embedding,
        metadata: {
          id,
          info,
          description: "Story of one piece",
        },
      },
    ]);
    console.log(result);
  } catch (error) {
    console.error("ERROR -----------> ");
    console.error(error);
  }
};

async function queryEmbeddings(question: string) {
  const questionEmbeddingResult = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: question,
  });
  const questionEmbedding = questionEmbeddingResult.data[0].embedding;

  const pcIndex = getIndex();

  const queryResult = await pcIndex.query({
    vector: questionEmbedding,
    topK: 1,
    includeMetadata: true,
    includeValues: true,
  });

  return queryResult;
}

async function askOpenAI(question: string, relevantInfo: string) {
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
  console.log(responseMessage);
}

export async function askQuestion(question: string) {
  const result = await queryEmbeddings(question);

  const relevantInfo = result.matches[0].metadata;
  if (relevantInfo) {
    askOpenAI(question, relevantInfo.info as string);
  }
}

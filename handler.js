'use strict';
const { get } = require('axios').default;

class Handle {

 constructor({ reko, translator }) {
   this.reko = reko
   this.translator = translator
 }

 async returnLabelsTrated(labels) {
   const labelItems = labels.Labels.filter(({ Confidence })=> Confidence >= 85)
   const names = labelItems.map(({ Name }) => Name).join(' and ');

   return { names, labelItems }
 }

 async detectImageLabels(buffer) {
   const result = await this.reko.detectLabels({
    Image: {
      Bytes: buffer
    }
   }).promise()

   const labelsTrated = this.returnLabelsTrated(result)

   return labelsTrated;

 }
  

async translatorText(text){
  const params = {
    SourceLanguageCode: "en",
    TargetLanguageCode: "pt",
    Text: text
  }

  const { TranslatedText } = await this.translator.translateText(params).promise()

  return TranslatedText.split(" e ");
}

 async formatResultText(text, labelItems) {
   const finalText = []

   for(const indexText in text) {
     const nameInPortuguese = text[indexText];
     const confidence = labelItems[indexText].Confidence;

     finalText.push(
       `${confidence.toFixed(2)}% de ser do tipo ${nameInPortuguese}`
     )
   }

   return finalText.join("\n ")
 } 

 async getImageBuffer(imageUrl) {
   const response = await get(imageUrl, {
     responseType: 'arraybuffer'
   })

   const buffer = Buffer.from(response.data, 'base64');

   return buffer;
 }

 async main (event) {
   const { imageUrl } = event.queryStringParameters;

  const buffer = await this.getImageBuffer(imageUrl)
  const { names, labelItems } =  await this.detectImageLabels(buffer)
  const textTranlated = await this.translatorText(names);

  const finalTextTranlated = await this.formatResultText(textTranlated, labelItems);
  
  try {
    
   return {
     statusCode: 200,
     body: `A imagem tem `.concat(finalTextTranlated)
   }
  } catch (error) {
     return {
       statusCode: 500,
       body: "internal server error"
     } 
  }

 }

}

const aws = require('aws-sdk')

const reko = new aws.Rekognition()
const translator = new aws.Translate()
const handle = new Handle({
  reko, 
  translator
})

module.exports.main = handle.main.bind(handle)



/**
 * Wildborne — InstantDB Schema reference
 *
 * This file documents the data model.
 * Schema is managed in the InstantDB dashboard:
 * https://www.instantdb.com/dash?s=main&t=home&app=b49bde92-c34b-445c-a956-3b8431e4eb25
 *
 * Entities:
 *   players     — one row per player (keyed by localStorage UUID)
 *   pets        — captured pet instances linked to player
 *   worldChunks — modified chunk resource node states
 *   quests      — quest progress records
 *
 * Links:
 *   playerPets    players → pets
 *   playerChunks  players → worldChunks
 *   playerQuests  players → quests
 */

export const SCHEMA_VERSION = '1.0.0'

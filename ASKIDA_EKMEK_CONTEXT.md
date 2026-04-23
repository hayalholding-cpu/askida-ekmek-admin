Askıda Ekmek – MASTER PROJECT CONTEXT

You are helping design and improve a mobile application called Askıda Ekmek.

This document explains the full project context so that you can correctly understand the product, its philosophy, technical stack, and design requirements.

Project Overview

Askıda Ekmek is a mobile application that enables people to leave bread for others at local bakeries.

It is inspired by the traditional Turkish culture of “askıda ekmek”, where someone pays for extra bread so another person in need can take it later.

The application connects:

citizens

local bakeries

people in need

through a simple and dignified sharing system.

The goal is to make solidarity easier through technology.

Important Language Rule

The application must never use the word “donation”.

This is extremely important.

Instead the app uses culturally appropriate phrases such as:

ekmek bırak

askıya bırak

askıdaki ekmek

The philosophy is sharing and solidarity, not charity.

The language should always reflect respect and dignity.

Product Philosophy

The application should feel:

trustworthy

warm

humane

simple

modern

It should not feel like a charity app.

Instead it should feel like:

community solidarity

everyday kindness

local support

The emotional tone is warm but respectful.

Target Users

The app serves three groups:

1 Citizens

People who want to leave bread at a bakery for someone else.

2 Bakeries

Local bakeries that participate in the system and distribute the bread.

3 People in need

Individuals who can take bread from the bakery.

The app does not require registration for people taking bread.

Technology Stack

The mobile application is built with:

Expo

React Native

Expo Router

Firebase Firestore

Other technologies may be added later if needed.

The system architecture is intentionally simple and scalable.

Current Application Screens

The current application includes the following screens:

1 Home Screen

The main entry screen of the app.

It currently contains:

a top brand ribbon

application title

a short slogan

a trust card

a card showing the number of breads left today

a primary action button

Example counter:

Bugün askıya bırakılan ekmek: 1284

Primary button:

Askıya ekmek bırak

2 Map Screen

This screen shows partner bakeries on a map.

Features include:

map view

bakery markers

bakery information

Future improvements include:

automatic nearest bakery detection

better bakery cards

3 Leave Bread Screen

This screen allows users to leave bread at a selected bakery.

Typical flow:

1 Select bakery
2 Choose bread amount
3 Confirm

The interaction should be extremely simple and fast.

4 Success Screen

After leaving bread, the user sees a success screen.

This screen should feel:

emotional

rewarding

positive

Example message:

“Bir sofraya umut oldunuz.”

5 Baker Dashboard

A special screen used by bakeries.

Features include:

number of breads received

number of breads taken

remaining breads

ability to decrease bread count when someone takes bread

Data Structure (Firestore)

Firestore is used as the backend database.

Typical collections include:

bakeries

Stores bakery information.

Example fields:

name

city

district

neighborhood

latitude

longitude

active

bread_transactions

Records bread leaving activity.

Fields may include:

bakeryId

breadCount

timestamp

daily_stats

Stores aggregated daily numbers.

Example document:

daily_stats
   2026-03-09
      totalBreadLeftToday: 1284

This data powers the home screen counter.

Current Development Goals

The next development steps include:

1 Live Counter

The home screen counter:

“Bugün askıya bırakılan ekmek”

should be fetched from Firestore and updated live.

2 Counter Animation

The number should animate smoothly from 0 to the real value to create a more premium experience.

3 Nearest Bakery Detection

The map screen should:

detect the user location

highlight nearby bakeries

simplify bakery selection

4 Design System

The app should adopt a consistent design system.

Example:

theme.ts

Define:

colors

spacing

border radius

typography

shadows

5 Premium App Experience

The goal is to reach App Store quality UI and UX.

The application should feel:

polished

smooth

trustworthy

minimal

elegant

UX Design Principles

The interface must be:

simple

calm

intuitive

fast

Prefer:

cards

soft shadows

clear hierarchy

large touch areas

Avoid:

clutter

complicated flows

heavy text

Key Interaction

The most important action in the entire application is:

“Askıya ekmek bırak”

This action should always be clearly visible and easy to access.

Future Ideas (Optional)

Possible future features:

weekly impact stats

total breads shared

featured bakeries

impact messages

community stories

These features should never harm simplicity.

Final Goal

The final goal is to build a high-quality social impact mobile app that:

respects the dignity of people

strengthens community solidarity

uses technology to make kindness easier.

The app should feel modern, trustworthy, and humane.
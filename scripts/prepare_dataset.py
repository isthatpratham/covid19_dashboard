import pandas as pd
import numpy as np
import os

# Get the absolute path to the project root (parent directory of 'scripts')
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dataset_dir = os.path.join(base_dir, 'dataset')

# STEP 1: Load the three CSV files
confirmed_df = pd.read_csv(os.path.join(dataset_dir, 'confirmed.csv'))
deaths_df = pd.read_csv(os.path.join(dataset_dir, 'deaths.csv'))
recovered_df = pd.read_csv(os.path.join(dataset_dir, 'recovered.csv'))

# STEP 2: Remove unnecessary columns
cols_to_drop = ['Province/State', 'Lat', 'Long']
confirmed_df = confirmed_df.drop(columns=cols_to_drop, errors='ignore')
deaths_df = deaths_df.drop(columns=cols_to_drop, errors='ignore')
recovered_df = recovered_df.drop(columns=cols_to_drop, errors='ignore')

# STEP 3: Group the dataset by country and aggregate totals
confirmed_df = confirmed_df.groupby('Country/Region').sum().reset_index()
deaths_df = deaths_df.groupby('Country/Region').sum().reset_index()
recovered_df = recovered_df.groupby('Country/Region').sum().reset_index()

# STEP 4: Convert the wide format into long format
confirmed_long = confirmed_df.melt(id_vars=['Country/Region'], var_name='date', value_name='confirmed_cases')
deaths_long = deaths_df.melt(id_vars=['Country/Region'], var_name='date', value_name='deaths')
recovered_long = recovered_df.melt(id_vars=['Country/Region'], var_name='date', value_name='recovered')

# STEP 5: Merge the three datasets into one dataframe
merged_df = confirmed_long.merge(deaths_long, on=['Country/Region', 'date'], how='left')
merged_df = merged_df.merge(recovered_long, on=['Country/Region', 'date'], how='left')

# Rename 'Country/Region' to 'country'
merged_df = merged_df.rename(columns={'Country/Region': 'country'})

# STEP 6: Convert date column into proper datetime format
merged_df['date'] = pd.to_datetime(merged_df['date'], format='%m/%d/%y')

# STEP 7: Remove duplicates and null values
merged_df = merged_df.drop_duplicates()
merged_df = merged_df.dropna()

# STEP 8: Compute additional analytics columns
# Adding replace(0, np.nan) to avoid division by zero
merged_df['mortality_rate'] = (merged_df['deaths'] / merged_df['confirmed_cases'].replace(0, np.nan)) * 100
merged_df['recovery_rate'] = (merged_df['recovered'] / merged_df['confirmed_cases'].replace(0, np.nan)) * 100

# Fill NaN resulting from division by zero with 0
merged_df['mortality_rate'] = merged_df['mortality_rate'].fillna(0)
merged_df['recovery_rate'] = merged_df['recovery_rate'].fillna(0)

# STEP 9: Add a column called month
merged_df['month'] = merged_df['date'].dt.month

# STEP 10: Identify the top 50 countries by total confirmed cases and filter
# Get the maximum confirmed cases per country (cumulative)
top_50_countries = merged_df.groupby('country')['confirmed_cases'].max().nlargest(50).index
clean_df = merged_df[merged_df['country'].isin(top_50_countries)]

# STEP 11: Sort the dataset by country and date
clean_df = clean_df.sort_values(by=['country', 'date'])

# STEP 12: Save the final cleaned dataset
# Ensure the dataset directory exists
os.makedirs(dataset_dir, exist_ok=True)
clean_df.to_csv(os.path.join(dataset_dir, 'clean_covid_data.csv'), index=False)

# STEP 13: Print summary information
print(f"Number of countries: {clean_df['country'].nunique()}")
print(f"Number of rows: {len(clean_df)}")
print(f"Date range in dataset: {clean_df['date'].min().date()} to {clean_df['date'].max().date()}")
